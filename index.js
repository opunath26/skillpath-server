const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Firebase Admin Setup
try {
    if (process.env.FIREBASE_SERVICE_KEY) {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
        const serviceAccount = JSON.parse(decoded);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    }
} catch (error) {
    console.error("Firebase Admin initialization error:", error.message);
}

// Middleware
app.use(cors({
    origin: ['https://ubiquitous-longma-59b633.netlify.app', 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());

const middleware = (req, res, next) => {
    console.log('Middleware working — Request URL:', req.originalUrl);
    next();
};
app.use(middleware);

// MongoDB Client
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('SkillPath Server is running');
});

async function run() {
    try {
        const db = client.db('skill_db');
        const coursesCollection = db.collection('courses');
        const studentsCollection = db.collection('students');
        const usersCollection = db.collection('users');
        const enrollmentsCollection = db.collection('enrollments');
        const instructorsCollection = db.collection('instructors');

        // --- Users API ---
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email };
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ success: false, message: 'User already exists' });
            }

            const result = await usersCollection.insertOne(newUser);
            res.send({ success: true, result });
        });

        // --- Instructors APIs (From Dedicated Collection) ---
        app.get('/instructors', async (req, res) => {
            try {
                const instructors = await instructorsCollection.find({}).toArray();
                res.send(instructors);
            } catch (err) {
                res.status(500).send({ success: false, message: "Error fetching instructors" });
            }
        });

        app.post('/instructors', async (req, res) => {
            try {
                const newInstructor = req.body;
                const result = await instructorsCollection.insertOne(newInstructor);
                res.send({ success: true, result });
            } catch (err) {
                res.status(500).send({ success: false, message: "Error adding instructor" });
            }
        });

        // --- Courses APIs ---
        app.get('/courses', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }

            const cursor = coursesCollection.find(query).sort({ createdAt: 'desc' });
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/courses/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await coursesCollection.findOne({ _id: new ObjectId(id) });

                if (!result) {
                    return res.status(404).send({ success: false, message: "Course not found" });
                }

                res.send({ success: true, result });
            } catch (err) {
                res.status(500).send({ success: false, message: "Server error" });
            }
        });

        app.post('/courses', async (req, res) => {
            const newCourse = req.body;
            const result = await coursesCollection.insertOne(newCourse);
            res.send({ success: true, result });
        });

        app.patch('/courses/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const updatedCourse = req.body;
                const query = { _id: new ObjectId(id) };

                const updateDoc = {
                    $set: {
                        title: updatedCourse.title,
                        price: updatedCourse.price,
                        description: updatedCourse.description,
                        duration: updatedCourse.duration,
                        image: updatedCourse.image,
                        rating: updatedCourse.rating,
                    }
                };

                const result = await coursesCollection.updateOne(query, updateDoc);

                if (result.modifiedCount === 0) {
                    return res.status(404).send({ success: false, message: "Course not updated or not found" });
                }

                res.send({ success: true, message: "Course updated successfully!" });
            } catch (err) {
                res.status(500).send({ success: false, message: "Server error" });
            }
        });

        app.delete('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await coursesCollection.deleteOne(query);
            res.send(result);
        });

        // --- Students APIs ---
        app.get('/students', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email;
            }

            const cursor = studentsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/students', async (req, res) => {
            const newStudent = req.body;
            const result = await studentsCollection.insertOne(newStudent);
            res.send(result);
        });

        // --- Enrollments APIs ---
        app.get('/enrollments', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ success: false, message: "Email query param required" });
            }

            try {
                const enrollments = await enrollmentsCollection.find({ studentEmail: email }).toArray();
                res.send(enrollments);
            } catch (err) {
                res.status(500).send({ success: false, message: "Server error" });
            }
        });

        app.post('/enrollments', async (req, res) => {
            try {
                const enrollmentData = req.body;
                enrollmentData.createdAt = new Date();

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

                const result = await enrollmentsCollection.insertOne(enrollmentData);
                res.status(201).send({
                    success: true,
                    message: 'Successfully Enrolled!',
                    data: result
                });

            } catch (err) {
                res.status(500).send({ success: false, message: 'Server Error' });
            }
        });

        app.delete('/enrollments/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await enrollmentsCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Enrollment not found"
                    });
                }

                res.send({
                    success: true,
                    message: "Enrollment deleted successfully"
                });

            } catch (err) {
                res.status(500).send({
                    success: false,
                    message: "Server Error"
                });
            }
        });

        console.log("Successfully connected to MongoDB!");
    } finally { }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`SkillPath Server is running on port ${port}`);
});

module.exports = app;