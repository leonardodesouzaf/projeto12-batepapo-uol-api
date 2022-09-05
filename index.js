import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("meu_lindo_projeto"); //O padrão é test
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/sign-up', function (req,res) {
    const user = req.body;
    if(!user.username || !user.avatar){
        return res.status(400).send('Todos os campos são obrigatórios!');
    }
    return res.status(201).send('OK'); 
});


app.listen(5000);
