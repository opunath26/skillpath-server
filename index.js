const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000

// middleware
app.use(cors({
    origin: ['http://localhost:5174'],
    credentials: true,
}));
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
        const usersCollection = db.collection('users')
        const enrollmentsCollection = db.collection('enrollments');

        app.post('/users', async (req, res) => {
            const newUser = req.body;

            const email = req.body.email;
            const query = { email: email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                res.send('user already exist. do not need to insert again')
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        })

        app.get('/instructors', async (req, res) => {
            try {
                const db = client.db('skill_db');
                const coursesCollection = db.collection('courses');

                const courses = await coursesCollection.find({}).toArray();

                const uniqueInstructors = [];
                const seen = new Set();

                courses.forEach((course) => {
                    if (!seen.has(course.instructorEmail)) {
                        seen.add(course.instructorEmail);
                        uniqueInstructors.push({
                            instructorName: course.instructorName,
                            instructorEmail: course.instructorEmail,
                            instructorPhoto: course.instructorPhoto,
                            totalCourses: courses.filter(c => c.instructorEmail === course.instructorEmail).length,
                            avgRating: (
                                courses
                                    .filter(c => c.instructorEmail === course.instructorEmail)
                                    .reduce((sum, c) => sum + (c.rating || 0), 0) /
                                courses.filter(c => c.instructorEmail === course.instructorEmail).length
                            ).toFixed(1)
                        });
                    }
                });

                res.send(uniqueInstructors);
            } catch (err) {
                res.status(500).send({ error: err.message });
            }
        });

        app.get('/courses', async (req, res) => {
            console.log(req.query)
            const email = req.query.email;
            const query = {}
            if (email) {
                query.email = email;
            }

            const projectsFields = { title: 1, price: 1, image: 1, rating: 1 }
            const cursor = coursesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/courses/:id', async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "http://localhost:5174");
            try {
                const id = req.params.id;

                const result = await coursesCollection.findOne({ _id: id });

                if (!result) {
                    return res.status(404).send({ error: "Course not found" });
                }

                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ error: "Server error" });
            }
        });

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
        app.get('/students', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }

            const cursor = studentsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/students', async (req, res) => {
            const newStudent = req.body;
            const result = await studentsCollection.insertOne(newStudent);
            res.send(result);
        })

        //  Enroll API
       app.post('/enroll', async (req, res) => {
    try {

        const enrollmentData = req.body;
        enrollmentData.createdAt = new Date();

        //  Check if already enrolled
        const exists = await enrollmentsCollection.findOne({
            courseId: enrollmentData.courseId,
            studentEmail: enrollmentData.studentEmail
        });

        if (exists) {
            return res.status(400).send({
                success: false,
                message: 'Already enrolled in this course'
            });
        }

        //  Insert new enrollment
        const result = await enrollmentsCollection.insertOne(enrollmentData);

        res.status(201).send({
            success: true,
            message: 'Successfully Enrolled!',
            data: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: 'Server Error' });
    }
});


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
