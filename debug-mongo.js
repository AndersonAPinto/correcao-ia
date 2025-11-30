const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://aaugustosilvapinto_db_user:9BIHi5u96jnXlZ01@corretor-ia.ijh7vga.mongodb.net/?retryWrites=true&w=majority";

async function run() {
    console.log("Attempting to connect to MongoDB...");
    console.log("Node version:", process.version);

    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        tls: true,
    });

    try {
        await client.connect();
        console.log("Connected successfully to server");
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error("Connection failed!");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        if (err.cause) console.error("Cause:", err.cause);
        console.error("Full error:", JSON.stringify(err, null, 2));
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
