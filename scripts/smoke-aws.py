#!/usr/bin/env python3
"""Exercise the deployed Lambda API and remove only records created by this run."""
import datetime, hashlib, json, pathlib, secrets, subprocess, time, urllib.request, urllib.error
root = pathlib.Path(__file__).resolve().parents[1]
config = dict(line.split('=',1) for line in (root/'.env.local').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
endpoint, key = config['LAMBDA_API_URL'], config['LAMBDA_API_KEY']
records, session = set(), ''
def call(path, body=None, expected=200):
    global session
    request = urllib.request.Request(endpoint+path, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type':'application/json','X-Api-Key':key,'Cookie':session})
    try:
        response = urllib.request.urlopen(request,timeout=30)
    except urllib.error.HTTPError as e:
        assert e.code == expected, f'{path}: expected {expected}, got {e.code}: {e.read().decode()}'
        return None
    assert response.status == expected, f'{path}: unexpected status {response.status}'
    cookie = response.headers.get('Set-Cookie')
    if cookie:
        session = cookie.split(';',1)[0]
        token = session.split('=',1)[1]
        if token: records.add('SESSION#'+hashlib.sha256(token.encode()).hexdigest())
    return json.load(response)
def account(name):
    phone='77'+str(secrets.randbelow(10**10)).zfill(10)
    records.add('USER#PHONE#'+phone)
    assert call('/auth/demo-phone/check',{'phone':phone}) == {'registered':False}
    call('/auth/demo-phone',{'phone':phone,'otp':'123'},400)
    out=call('/auth/demo-phone',{'name':name,'phone':phone,'otp':'anything'})
    return out['user']
def cleanup():
    result = subprocess.run(['aws','cloudformation','describe-stacks','--stack-name','eventforge-campus','--output','json','--no-cli-pager'],capture_output=True,text=True,check=True)
    table = next(o['OutputValue'] for o in json.loads(result.stdout)['Stacks'][0]['Outputs'] if o['OutputKey']=='TableName')
    for pk in records:
        subprocess.run(['aws','dynamodb','delete-item','--table-name',table,'--key',json.dumps({'pk':{'S':pk}}),'--no-cli-pager'],capture_output=True,text=True,check=True)
try:
    public = call('/workspace'); assert public['user'] is None and len(public['events']) >= 4 and public['demoAuthEnabled']
    print('PASS public event listing',flush=True)
    owner = account('Smoke Organizer'); owner_session = session
    day = datetime.date.today()+datetime.timedelta(days=45)
    event = call('/events',{'title':'Deployment smoke test','organizer':'Automated verification','description':'Temporary event created to verify the deployed platform end to end.','track':'Open innovation','mode':'Online','location':'Online','startsAt':str(day),'endsAt':str(day+datetime.timedelta(days=1)),'deadline':str(day-datetime.timedelta(days=1)),'prize':0,'teamSize':2,'capacity':1},201)['event']
    eid = event['id']; records.add('EVENT#'+eid)
    print('PASS account creation and event publishing',flush=True)
    participant = account('Smoke Participant'); participant_session = session
    call('/events/'+eid+'/participants',expected=403)
    call('/events/'+eid+'/register',{'teamName':'Smoke Team','members':''},201)
    records.update(['REG#'+eid+'#'+participant['id'],'SLOT#'+eid+'#0'])
    call('/events/'+eid+'/register',{'teamName':'Duplicate','members':''},409)
    call('/events/'+eid+'/submission',{'title':'Smoke Project','description':'A working project submitted through the live AWS API.','repository':'https://github.com/example/smoke'})
    print('PASS registration, duplicate protection, submission, organizer access control',flush=True)
    call('/events/'+eid+'/bookmark',{'saved':True})
    records.add('SAVE#'+participant['id']+'#'+eid)
    assert eid in call('/workspace')['savedEventIds']
    post=call('/feed',{'category':'Build log','content':'A temporary smoke-test post verifying live feed persistence.'},201)['post']
    records.update(['POST#'+post['id'],'LIMIT#post#'+participant['id']+'#'+str(int(time.time()//900))])
    session=owner_session
    assert eid not in call('/workspace')['savedEventIds']
    call('/feed/'+post['id']+'/reaction',{'active':True})
    call('/feed/'+post['id']+'/reaction',{'active':True})
    records.add('REACTION#'+post['id']+'#'+owner['id'])
    comment=call('/feed/'+post['id']+'/comments',{'content':'The live comment API works.'},201)['comment']
    records.update(['COMMENT#'+post['id']+'#'+comment['id'],'LIMIT#comment#'+owner['id']+'#'+str(int(time.time()//900))])
    updated=next(p for p in call('/feed')['posts'] if p['id']==post['id'])
    assert updated['reactions']==1 and updated['reacted'] and updated['comments'][0]['author']=='Smoke Organizer'
    print('PASS private bookmarks, feed posts, idempotent reactions, and replies',flush=True)
    session = owner_session
    teams = call('/events/'+eid+'/participants')['registrations']; assert len(teams)==1 and teams[0]['submission']['title']=='Smoke Project'
    print('PASS organizer reads persisted project',flush=True)
    assert call('/auth/demo-phone/check',{'phone':participant['phone']}) == {'registered':True,'name':'Smoke Participant'}
    returning=call('/auth/demo-phone',{'phone':participant['phone'],'otp':'999999'})['user']
    assert returning['id']==participant['id'] and returning['name']=='Smoke Participant'
    assert eid in call('/workspace')['savedEventIds']
    print('PASS new-phone name requirement, any OTP, returning identity, and account data',flush=True)
    session = participant_session; old_session = session; call('/auth/signout',{}); session = old_session
    assert call('/workspace')['user'] is None
    print('PASS signout invalidates live session',flush=True)
finally:
    cleanup(); print('Smoke-test records removed.',flush=True)
