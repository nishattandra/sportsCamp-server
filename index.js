const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

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
    const registeredUserCollection = client.db("summercampDB").collection("registeredusers");
    const classesCollection = client.db("summercampDB").collection("classes");

    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
        res.send({ token })
    })

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

    // Admin
    app.get('/admin/registeredusers',verifyJWT, async (req, res) => {
        const result = await registeredUserCollection.find().toArray();
        res.send(result);
    });
    app.patch('/admin/typeupdate/:id', async (req, res) => {
        const id = req.params.id;
            const type = req.query.type;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    type: type
                },
            };
            const result = await registeredUserCollection.updateOne(query, updateDoc);
            res.send(result);
    });
    app.get('/admin/manageclasses', verifyJWT, async (req, res) => {
        const result = await classesCollection.find().toArray();
        res.send(result);
    });
    app.patch('/admin/conditionupdate/:id', async (req, res) => {
        const id = req.params.id;
            const condition = req.query.condition;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    condition: condition
                },
            };
            const result = await classesCollection.updateOne(query, updateDoc);
            res.send(result);
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
