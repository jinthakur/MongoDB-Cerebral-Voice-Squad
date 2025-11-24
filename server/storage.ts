import { type User, type InsertUser, type Command, type InsertCommand } from "@shared/schema";
import { randomUUID } from "crypto";
import { MongoClient, Db, Collection, ObjectId } from "mongodb";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  saveCommand(command: InsertCommand): Promise<Command>;
  getAllCommands(): Promise<Command[]>;
  getRecentCommands(limit: number): Promise<Command[]>;
  searchCommands(query: string, limit?: number): Promise<Command[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveCommand(_command: InsertCommand): Promise<Command> {
    throw new Error("MongoDB required for command storage");
  }

  async getAllCommands(): Promise<Command[]> {
    return [];
  }

  async getRecentCommands(_limit: number): Promise<Command[]> {
    return [];
  }

  async searchCommands(_query: string, _limit?: number): Promise<Command[]> {
    return [];
  }
}

export class MongoDBStorage implements IStorage {
  private client: MongoClient;
  private db: Db | null = null;
  private commandsCollection: Collection<Command> | null = null;

  constructor() {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    this.client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  }

  private async connect(): Promise<void> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db("cerebral_voice");
      this.commandsCollection = this.db.collection<Command>("commands");
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    return { ...insertUser, id };
  }

  async saveCommand(command: InsertCommand): Promise<Command> {
    await this.connect();
    if (!this.commandsCollection) {
      throw new Error("Commands collection not initialized");
    }

    const doc = {
      ...command,
      timestamp: new Date(command.timestamp)
    };

    const result = await this.commandsCollection.insertOne(doc as any);
    return {
      ...command,
      _id: result.insertedId.toString()
    };
  }

  async getAllCommands(): Promise<Command[]> {
    await this.connect();
    if (!this.commandsCollection) {
      return [];
    }

    const commands = await this.commandsCollection
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    return commands.map(cmd => ({
      ...cmd,
      _id: cmd._id?.toString()
    }));
  }

  async getRecentCommands(limit: number): Promise<Command[]> {
    await this.connect();
    if (!this.commandsCollection) {
      return [];
    }

    const commands = await this.commandsCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return commands.map(cmd => ({
      ...cmd,
      _id: cmd._id?.toString()
    }));
  }

  async searchCommands(query: string, limit: number = 10): Promise<Command[]> {
    await this.connect();
    if (!this.commandsCollection) {
      return [];
    }

    try {
      // MongoDB Atlas Search aggregation pipeline
      const searchPipeline = [
        {
          $search: {
            index: "default",
            text: {
              query: query,
              path: {
                wildcard: "*"
              }
            }
          }
        },
        {
          $limit: limit
        }
      ];

      const commands = await this.commandsCollection
        .aggregate(searchPipeline)
        .toArray() as any[];

      return commands.map(cmd => ({
        ...cmd,
        _id: cmd._id?.toString()
      })) as Command[];
    } catch (error: any) {
      console.error('[MongoDB Atlas Search] Search failed:', error.message);
      // Fallback to recent commands if search fails
      console.log('[MongoDB Atlas Search] Falling back to recent commands');
      return this.getRecentCommands(limit);
    }
  }
}

export const storage = new MongoDBStorage();
