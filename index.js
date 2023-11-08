const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5005;




app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hq29e8f.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
//  middle ware
const logger = (req, res, next) => {
    console.log('log info:', req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ massage: 'unauthorized access' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({ massage: 'unauthorized access' });
        }
        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const categoryCollection = client.db('categoryDB').collection('category');
        const booksCollection = client.db('categoryDB').collection('allBook');
        const borrowCollection = client.db('categoryDB').collection('borrow');


        // jwt related
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        })

        app.post('/logout', logger, async (req, res) => {
            const user = req.body;
            console.log('log out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        // borrow Collection
        app.post('/borrows', logger, async (req, res) => {
            const book = req.body;
            const result = await borrowCollection.insertOne(book);
            res.send(result);
        })

        app.get('/borrows', logger, verifyToken, async (req, res) => {
            console.log('token owner info', req.user);
            if(req.user.email !== req.query.email){
                return res.status(403).send({ massage: 'forbidden' });
            }
            if(req.query?.email){
                query = {email: req.query.email}
            }
            const result = await borrowCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/borrows/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await borrowCollection.deleteOne(query);
            res.send(result)
        })




        // category get
        app.get('/bookCategory', logger, async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result)
            // console.log(result)
        })
        // books post 
        app.post('/books', logger, async (req, res) => {

            const books = req.body;
            const result = await booksCollection.insertOne(books);
            res.send(result)
            console.log(result)
        })

        app.get('/books', logger, verifyToken, async (req, res) => {
            const result = await booksCollection.find().toArray();
            res.send(result);
        })

        app.get('/books/:id', logger,verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await booksCollection.findOne(query);
            res.send(result);
        })

        app.put('/books/:id', logger, verifyToken, async (req, res) => {
            const id = req.params.id;
            const book = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateBook = {
                $set: {
                    bookPhoto: book.bookPhoto,
                    bookName: book.bookName,
                    authorName: book.authorName,
                    rating: book.rating,
                    category: book.category,
                }
            }
            const result = await booksCollection.updateOne(filter, updateBook, options);
            res.send(result)
        })

        // app.patch('/books', async(req, res)=>{
        //     const books = req.body;
        //     const nowQuantity = books.quantity - 1
        //     const filter = {_id: books._id};
        //     const updateBooks = {
        //         $set: {
        //             quantity: books.nowQuantity
        //         }
        //     }
        //     const result = await booksCollection.updateOne(filter, updateBooks);
        //     res.send(result);
        // })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Library Server Is Running');
})
app.listen(port, () => {
    console.log(`My Library Running From ${port}`)
})




