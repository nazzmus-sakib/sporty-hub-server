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
    const userCollection = client.db("SportyDb").collection("users");

    // save user to db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = req.query.email;
      const isExist = await userCollection.findOne({ email: email });
      if (isExist) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

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
    // get all user
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    // get  classes by email
    app.get("/classes/:email", async (req, res) => {
      const classes = await classCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(classes);
    });
    // post classes by instructor
    app.post("/classes", async (req, res) => {
      const classes = req.body;
      const result = await classCollection.insertOne(classes);
      res.send(result);
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

    // update seats after enrollment
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
    // update enrollment number for each after enrollment
    app.patch("/update-enroll-number/:classId", async (req, res) => {
      const classId = req.params.classId;
      const updatedDoc = {
        $inc: { total_enroll: +1 },
      };
      const options = { upsert: true };
      const result = await classCollection.updateOne(
        { _id: new ObjectId(classId) },
        updatedDoc,
        options
      );

      res.send(result);
    });

    // find user role instructor
    app.get("/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email: email });

      if (result) {
        res.send({ role: result.role });
      } else {
        // Handle the case when the user with the given email is not found
        res.status(404).send({ error: "User not found" });
      }
    });

    // find user role admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email: email });

      if (result) {
        res.send({ role: result.role });
      } else {
        // Handle the case when the user with the given email is not found
        res.status(404).send({ error: "User not found" });
      }
    });

    // update status pending to approve
    app.patch("/update-status-approved/:id", async (req, res) => {
      const classId = req.params.id;
      const updatedDoc = {
        $set: { status: "approved" },
      };
      const options = { upsert: true };
      const result = await classCollection.updateOne(
        { _id: new ObjectId(classId) },
        updatedDoc,
        options
      );

      res.send(result);
    });
    // update status pending to deny
    app.patch("/update-status-deny/:id", async (req, res) => {
      const classId = req.params.id;
      const updatedDoc = {
        $set: { status: "denied" },
      };
      const options = { upsert: true };
      const result = await classCollection.updateOne(
        { _id: new ObjectId(classId) },
        updatedDoc,
        options
      );

      res.send(result);
    });
    // update user role student to instructor
    app.patch("/update-role-instructor/:id", async (req, res) => {
      const id = req.params.id;
      const updatedDoc = {
        $set: { role: "instructor" },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        updatedDoc,
        options
      );

      res.send(result);
    });

    // update user role student to admin
    app.patch("/update-role-admin/:id", async (req, res) => {
      const id = req.params.id;
      const updatedDoc = {
        $set: { role: "admin" },
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        updatedDoc,
        options
      );

      res.send(result);
    });

    // update feedback by admin
    app.patch("/update-feedback/:id", async (req, res) => {
      const id = req.params.id;
      const { feedback } = req.body;
      console.log(feedback);
      const updatedDoc = {
        $set: { feedback: feedback },
      };
      const options = { upsert: true };
      const result = await classCollection.updateOne(
        { _id: new ObjectId(id) },
        updatedDoc,
        options
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
