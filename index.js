const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000

// middleware
app.use(cors());
app.use(express.json())

const uri = "mongodb+srv://skillPathUser:U0zzlsNWXbVU0zAP@cluster0.q4baesu.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('SkillPath Server is running')
})

async function run() {
    try {
        await client.connect();

        const db = client.db('skill_db');
        const coursesCollection = db.collection('courses');
        const studentsCollection = db.collection('students')

        app.get('/courses', async (req, res) => {

            console.log(req.query)
            const email = req.query.email;
            const query = {}
            if(email){
                query.email = email;
            }


            const projectsFields = { title: 1, price: 1, image: 1, rating: 1 }
            const cursor = coursesCollection.find(query).sort({ price: -1 });
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await coursesCollection.findOne(query);
            res.send(result);
        })

        app.post('/courses', async (req, res) => {
            const newCourse = req.body;
            const result = await coursesCollection.insertOne(newCourse);
            res.send(result);
        })

        app.patch('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const updatedCourse = req.body;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    name: updatedCourse.name,
                    price: updatedCourse.price
                }
            }
            const result = await coursesCollection.updateOne(query, update)
            res.send(result)
        })

        app.delete('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await coursesCollection.deleteOne(query);
            res.send(result);
        })

        // students related apis
        app.get('/students', async(req, res) => {

            const email = req.query.email;
            const query = {};
            if(email){
                query.email = email;
            }

            const cursor = studentsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/students', async(req, res) => {
            const newStudent = req.body;
            const result = await studentsCollection.insertOne(newStudent);
            res.send(result);
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir)

app.listen(port, () => {
    console.log(`SkillPath Server is running on port ${port}`)
})