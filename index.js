const express = require("express");
const app = express();
const port = 4000;
const cors = require("cors");
app.use(cors());
app.use(express.json());
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASS}@cluster0.xtgyyfk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const popularClassCollection = client
      .db("SportyDb")
      .collection("populer_classes");
    const topInstructorsCollection = client
      .db("SportyDb")
      .collection("top_instructors");

    const instructorsCollection = client
      .db("SportyDb")
      .collection("instructors");

    const classCollection = client.db("SportyDb").collection("classes");
    const selectedCollection = client
      .db("SportyDb")
      .collection("selected-class");

    app.get("/popular_classes", async (req, res) => {
      const classes = await popularClassCollection.find().toArray();
      res.send(classes);
    });

    // get top instructors
    app.get("/top-instructors", async (req, res) => {
      const instructors = await topInstructorsCollection.find().toArray();
      res.send(instructors);
    });

    // get all instructors
    app.get("/instructors", async (req, res) => {
      const instructors = await instructorsCollection.find().toArray();
      res.send(instructors);
    });
    // get all classes
    app.get("/classes", async (req, res) => {
      const classes = await classCollection.find().toArray();
      res.send(classes);
    });

    // post selected class
    app.post("/selected-class", async (req, res) => {
      const data = req.body;

      const result = await selectedCollection.insertOne(data);
      res.send(result);
    });
    // find selected class by email
    app.get("/selected-class/:email", async (req, res) => {
      const email = req.params.email;
      const result = await selectedCollection
        .find({
          purchase_by: email,
        })
        .toArray();
      res.send(result);
    });
    // delete selected class by id
    app.delete("/selected-class/:id", async (req, res) => {
      const id = req.params.id;
      const result = await selectedCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
