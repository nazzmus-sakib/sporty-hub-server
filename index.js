const express = require("express");
const app = express();
const port = 4000;
const cors = require("cors");
app.use(cors());
app.use(express.json());
require("dotenv").config();
const stripe = require("stripe")(
  "sk_test_51NLOgAAQGAYgYwlveMj6ue8747dnWiILMCKPv2cMLNAFJLgxaNRxaTjq7MoxEbaAykIO54Y24kiruI71CdbeRQ4L00v3FGp0CZ"
);

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
    const paymentCollection = client.db("SportyDb").collection("payments");

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

    // create a payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseFloat(amount.toFixed(2)),
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // save payment
    app.post("/payments", async (req, res) => {
      const data = req.body;
      const result = await paymentCollection.insertOne(data);
      res.send(result);
    });

    // get payment history
    app.get("/payment/:email", async (req, res) => {
      const email = req.params.email;
      const result = await paymentCollection
        .find({ email: email })
        .sort({
          date: -1,
        })
        .toArray();
      res.send(result);
    });
    // delete selected when successfully enrolled
    app.delete("/delete-selected-class/:selectedId", async (req, res) => {
      const selectedId = req.params.selectedId;
      const result = await selectedCollection.deleteOne({
        _id: new ObjectId(selectedId),
      });
      res.send(result);
    });

    // TODO: update seats after enrollment
    app.patch("/update-seats/:classId", async (req, res) => {
      const classId = req.params.classId;
      const updatedDoc = {
        $inc: { available_seats: -1 },
      };
      const result = await classCollection.updateOne(
        { _id: new ObjectId(classId) },
        updatedDoc
      );

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
