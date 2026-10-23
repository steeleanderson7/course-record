export type Friend = {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string;
};

export type Course = {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  par: number | null;
};

export type Round = {
  id: string;
  courseId: string;
  userId: string;
  score: number;
  holesPlayed: 9 | 18;
  datePlayed: string;
};

export type CourseRecord = {
  courseId: string;
  holderUserId: string;
  score: number;
  datePlayed: string;
};
