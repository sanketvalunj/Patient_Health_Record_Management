import { ethers } from "hardhat";
import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("\n--- Hardhat Final Funding Script ---");

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI missing in .env");

  try {
    // 1. Connect to the correct database
    await mongoose.connect(MONGODB_URI, { dbName: 'ehr-platform' });
    const db = mongoose.connection.db;
    if (!db) throw new Error("DB Connection failed");
    console.log(`✅ Connected to DB: ${mongoose.connection.name}`);

    // 2. Fetch all users
    const collection = db.collection('users');
    const allUsers = await collection.find({}).toArray();
    console.log(`Total users found: ${allUsers.length}`);

    // 3. Get the "Bank" (The first Hardhat account with 10,000 ETH)
    const [deployer] = await ethers.getSigners();
    console.log(`Bank Account (Sender): ${deployer.address}`);

    const bankBalance = await ethers.provider.getBalance(deployer.address);
    console.log(`Bank Balance: ${ethers.formatEther(bankBalance)} ETH\n`);

    // 4. The Funding Loop
    for (const user of allUsers) {
      if (user.role === 'admin') continue;

      // Targeting your specific 'blockchainAddress' field
      const targetAddress = user.blockchainAddress;

      if (targetAddress && targetAddress.startsWith("0x")) {
        console.log(`💰 Funding ${user.role} (${user.name}): ${targetAddress}`);

        try {
          const tx = await deployer.sendTransaction({
            to: targetAddress,
            value: ethers.parseEther("10.0"), // Sending 10 ETH
          });

          await tx.wait(); // Wait for confirmation
          console.log(`   ✅ Success! Hash: ${tx.hash}`);
        } catch (err) {
          console.error(`   ❌ Transaction failed for ${targetAddress}:`, err);
        }
      } else {
        console.log(`   ⏭️ Skipping ${user.name || user.email}: No blockchainAddress found.`);
      }
    }

  } catch (error) {
    console.error("❌ Critical Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n--- Funding Operation Finished ---");
  }
}

main().catch(console.error);