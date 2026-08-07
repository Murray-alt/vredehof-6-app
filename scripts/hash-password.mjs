import crypto from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run db:hash-password -- <plain-text-password>");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");

console.log(`${salt}:${hash}`);
