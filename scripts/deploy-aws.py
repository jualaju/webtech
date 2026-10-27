#!/usr/bin/env python3
"""Deploy EventForge without putting secrets in command arguments or console output."""
import hashlib, json, os, pathlib, secrets, subprocess, sys, time, zipfile, tempfile
root = pathlib.Path(__file__).resolve().parents[1]
os.chdir(root)
def aws(*args, payload=None):
    command = ['aws', *args, '--output', 'json', '--no-cli-pager']
    with tempfile.TemporaryDirectory(prefix='eventforge-aws-') as temp:
        if payload is not None:
            parameters = pathlib.Path(temp)/'parameters.json'
            parameters.write_text(json.dumps(payload)); parameters.chmod(0o600)
            command += ['--cli-input-json', 'file://' + str(parameters)]
        result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout or '{}')
try:
    identity = aws('sts', 'get-caller-identity')
    region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION') or subprocess.run(['aws','configure','get','region'],capture_output=True,text=True).stdout.strip() or 'ap-south-1'
    os.environ['AWS_DEFAULT_REGION'] = region
    stack = os.environ.get('EVENTFORGE_STACK', 'eventforge-campus')
    subprocess.run(['npm','run','build:backend'],check=True)
    archive = root/'dist'/'lambda.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z: z.write(root/'dist'/'index.js','index.js')
    bucket = f"eventforge-artifacts-{identity['Account']}-{region}"
    try: aws('s3api','head-bucket','--bucket',bucket)
    except RuntimeError:
        params = {'Bucket':bucket}
        if region != 'us-east-1': params['CreateBucketConfiguration'] = {'LocationConstraint':region}
        aws('s3api','create-bucket',payload=params)
        aws('s3api','put-public-access-block',payload={'Bucket':bucket,'PublicAccessBlockConfiguration':{'BlockPublicAcls':True,'IgnorePublicAcls':True,'BlockPublicPolicy':True,'RestrictPublicBuckets':True}})
    key = 'lambda/' + hashlib.sha256(archive.read_bytes()).hexdigest() + '.zip'
    aws('s3api','put-object','--bucket',bucket,'--key',key,'--body',str(archive))
    env_path = root/'.env.local'
    values = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line and not line.startswith('#') and '=' in line:
                k,v = line.split('=',1); values[k] = v.strip('"\'')
    api_key = values.get('LAMBDA_API_KEY') or secrets.token_hex(32)
    parameters = [{'ParameterKey':'CodeBucket','ParameterValue':bucket},{'ParameterKey':'CodeKey','ParameterValue':key},{'ParameterKey':'ApiKey','ParameterValue':api_key}]
    demo_enabled=os.environ.get('DEMO_AUTH_ENABLED',values.get('DEMO_AUTH_ENABLED','false'))
    parameters.append({'ParameterKey':'DemoAuthEnabled','ParameterValue':demo_enabled})
    request = {'StackName':stack,'TemplateBody':(root/'backend'/'infrastructure.json').read_text(),'Parameters':parameters,'Capabilities':['CAPABILITY_IAM']}
    try: aws('cloudformation','describe-stacks','--stack-name',stack); exists = True
    except RuntimeError as e:
        if 'does not exist' not in str(e): raise
        exists = False
    print(f"{'Updating' if exists else 'Creating'} {stack} in {region}...",flush=True)
    try: aws('cloudformation','update-stack' if exists else 'create-stack',payload=request)
    except RuntimeError as e:
        if 'No updates are to be performed' not in str(e): raise
    while True:
        info = aws('cloudformation','describe-stacks','--stack-name',stack)['Stacks'][0]
        status = info['StackStatus']
        if status in ['CREATE_COMPLETE','UPDATE_COMPLETE']: break
        if not status.endswith('_IN_PROGRESS'):
            events = aws('cloudformation','describe-stack-events','--stack-name',stack)['StackEvents']
            reasons = [e.get('ResourceStatusReason','') for e in events if e['ResourceStatus'].endswith('FAILED')]
            raise RuntimeError(status + ': ' + '; '.join(reasons[:3]))
        print(status,flush=True); time.sleep(8)
    outputs = {o['OutputKey']:o['OutputValue'] for o in info['Outputs']}
    values.update(LAMBDA_API_URL=outputs['ApiUrl'],LAMBDA_API_KEY=api_key,DEMO_AUTH_ENABLED=demo_enabled)
    env_path.write_text('\n'.join(f'{k}={v}' for k,v in values.items())+'\n'); env_path.chmod(0o600)
    print('AWS backend deployed: '+outputs['ApiUrl'])
    print('Credentials saved to .env.local (gitignored). Add LAMBDA_API_URL and LAMBDA_API_KEY to Vercel, then redeploy.')
except (RuntimeError, subprocess.CalledProcessError) as e:
    print(str(e),file=sys.stderr); sys.exit(1)
