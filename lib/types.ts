export type User = { id: string; name: string; email?: string; phone?: string };
export type Hackathon = {
  id: string;
  title: string;
  organizer: string;
  description: string;
  track: string;
  mode: string;
  location: string;
  startsAt: string;
  endsAt: string;
  deadline: string;
  prize: number;
  teamSize: number;
  capacity: number;
  ownerId: string;
  color: string;
  registrations: number;
};
export type Registration = {
  id: string;
  eventId: string;
  userId: string;
  teamName: string;
  members: string;
  createdAt: string;
  submission?: {
    title: string;
    description: string;
    repository: string;
    demo: string;
    submittedAt: string;
  };
};
export type Workspace = {
  demoAuthEnabled: boolean;
  user: User | null;
  events: Hackathon[];
  registrations: Registration[];
  savedEventIds: string[];
};

export type FeedCategory = 'Build log' | 'Team up' | 'Shitpost' | 'Question';
export type FeedComment = {
  id: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: string;
};
export type FeedPost = {
  id: string;
  author: string;
  authorId: string;
  role: string;
  category: FeedCategory;
  content: string;
  createdAt: string;
  color: string;
  sample?: boolean;
  reactions: number;
  reacted: boolean;
  comments: FeedComment[];
};
