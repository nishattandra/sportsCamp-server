const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
// console.log(process.env.PAYMENT_SECRET_KEY);
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xoojudr.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Work Here
    const registeredUserCollection = client
      .db("summercampDB")
      .collection("registeredusers");
    const classesCollection = client.db("summercampDB").collection("classes");
    const StudentSelectCollection = client
      .db("summercampDB")
      .collection("selectedclass");
    const paymentCollection = client.db("summercampDB").collection("payments");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    //User Type Check
    app.get("/users/checkadmin/:email",verifyJWT, async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const user = await registeredUserCollection.findOne(query);
      const result = { admin: user?.type === "admin" };
      res.send(result);
    });
    app.get("/users/checkinstructor/:email",verifyJWT, async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const user = await registeredUserCollection.findOne(query);
      const result = { instructor: user?.type === "instructor" };
      res.send(result);
    });
    app.get("/users/checkstudent/:email",verifyJWT,async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const user = await registeredUserCollection.findOne(query);
      const result = { student: user?.type !== "admin" && user?.type !== "instructor" };
      res.send(result);
    });

    app.post("/registeredusers", async (req, res) => {
      const newUsers = req.body;
      const query = { email: newUsers.email };
      const alreadyregistered = await registeredUserCollection.findOne(query);

      if (alreadyregistered) {
        return res.send({ message: "user already exists" });
      }

      const result = await registeredUserCollection.insertOne(newUsers);
      res.send(result);
    });
    app.get("/instructors", async (req, res) => {
      const query = { type: "instructor" };
      const result = await registeredUserCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/classes", async (req, res) => {
      const query = { condition: "approved" };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/populars", async (req, res) => {
      const query = { condition: "approved" };
      const popularclass = await classesCollection
        .find(query)
        .limit(6)
        .sort({ student: -1 })
        .toArray();
      const filter = { type: "instructor" };
      const popularinstructor = await registeredUserCollection
        .find(filter)
        .limit(6)
        .toArray();
      res.send([popularclass, popularinstructor]);
    });

    // Admin
    app.get("/admin/registeredusers", verifyJWT, async (req, res) => {
      const result = await registeredUserCollection.find().toArray();
      res.send(result);
    });
    app.patch("/admin/typeupdate/:id",verifyJWT, async (req, res) => {
      const id = req.params.id;
      const type = req.query.type;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          type: type,
        },
      };
      const result = await registeredUserCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.get("/admin/manageclasses", verifyJWT, async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    app.patch("/admin/conditionupdate/:id",verifyJWT, async (req, res) => {
      const id = req.params.id;
      const condition = req.query.condition;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          condition: condition,
        },
      };
      const result = await classesCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.patch("/admin/feedback/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const feedback = req.query.feedback;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };

      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // Instructor
    app.post("/instructor/addclasses", verifyJWT, async (req, res) => {
      const newItem = req.body;
      console.log(newItem);
      const result = await classesCollection.insertOne(newItem);
      res.send(result);
    });
    // Instructor
    app.get("/instructor/addedclasses/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // Student
    app.post("/student/selectclasses", verifyJWT, async (req, res) => {
      const newItem = req.body;
      //   console.log(newItem)
      const result = await StudentSelectCollection.insertOne(newItem);
      res.send(result);
    });
    app.get("/student/selectedclasses",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { useremail: email, status: "booked" };
      const result = await StudentSelectCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/student/enrollclasses",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { useremail: email, status: "paid" };
      const result = await StudentSelectCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/student/selectclass/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await StudentSelectCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/student/payments",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { useremail: email };
      const result = await paymentCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // Payment
    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // Payment Details
    app.get("/student/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await StudentSelectCollection.findOne(query);
      res.send(result);
      // console.log(id)
    });
    app.post("/student/paymenthistory", verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });
    app.patch("/student/paidclass/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const status = req.query.status;
      // console.log(id, status);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        },
      };

      const result = await StudentSelectCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/student/updateapproved/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      const newSeat = result?.seat - 1;
      const newStudent = result?.student + 1;
      const updateDoc = {
        $set: {
          seat: newSeat,
          student: newStudent,
        },
      };

      const insertedresult = await classesCollection.updateOne(
        query,
        updateDoc
      );
      res.send(insertedresult);
    });

    // Work End
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
  res.send("Sports Camp is running");
});

app.listen(port, () => {
  console.log(`Sports running on port ${port}`);
});
