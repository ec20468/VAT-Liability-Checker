import { embed, embedMany } from "ai";
import { db } from "../db";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
