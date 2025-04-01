
export interface User {
  id: string;
  email: string;
  verified: boolean;
}

export interface Sublet {
  id: string;
  userId: string;
  userEmail: string;
  price: number;
  location: string;
  distanceFromNEU: number;
  startDate: string;
  endDate: string;
  description: string;
  photos: string[];
  createdAt: string;
  genderPreference: "male" | "female" | "any";
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
}
