# Data Model

Use TypeScript domain types independent of UI and storage implementation.

```ts
export type Gender = 'M' | 'F';
export type SessionPlayerStatus = 'ACTIVE' | 'NOT_ARRIVED' | 'PAUSED' | 'LEFT';

export interface PlayerProfile {
  id: string;
  name: string;
  gender: Gender;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPlayer {
  playerId: string;
  status: SessionPlayerStatus;
  joinedAtRound: number;
  leftAtRound?: number;
  totalGames: number;
  eligibleRounds: number;
  restRounds: number;
  currentRestStreak: number;
  consecutiveGames: number;
  partnerHistory: Record<string, number>;
  opponentHistory: Record<string, number>;
  fixedPartnerId?: string;
}

export interface Team {
  playerIds: [string, string];
}

export interface Match {
  court: number;
  teamA: Team;
  teamB: Team;
}

export interface RoundSchedule {
  roundNumber: number;
  estimatedStart?: string;
  estimatedEnd?: string;
  matches: Match[];
  restingPlayerIds: string[];
}

export interface ScoreBreakdown {
  total: number;
  gameBalance: number;
  restFairness: number;
  partnerDiversity: number;
  opponentDiversity: number;
  consecutive: number;
}

export interface ScheduleBlock {
  id: string;
  startTime: string;
  durationMinutes: number;
  courtCount: 1 | 2;
  pointsPerGame: number;
  plannedRounds: number;
  rounds: RoundSchedule[];
  originalGeneratedRounds: RoundSchedule[];
  score: ScoreBreakdown;
  manuallyModified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  date: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  playerIds: string[];
  sessionPlayers: Record<string, SessionPlayer>;
  blocks: ScheduleBlock[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type ManualChange =
  | {
      id: string;
      type: 'SWAP';
      blockId: string;
      roundNumber: number;
      playerA: string;
      playerB: string;
      createdAt: string;
    }
  | {
      id: string;
      type: 'REPLACE';
      blockId: string;
      roundNumber: number;
      playingPlayer: string;
      restingPlayer: string;
      createdAt: string;
    };
```

## IndexedDB Stores
Suggested stores:
- players
- sessions
- appSettings
- uiDrafts (optional)

Use a small repository layer so storage can later be replaced/synced without changing pairing logic.

## Persistence Rules
Persist after:
- player CRUD
- session creation/config changes
- schedule generation
- manual schedule edit
- player status change
- block creation
- session completion

On app launch:
- load unfinished ACTIVE/DRAFT session and offer Continue.
- otherwise show Home / New Session.
