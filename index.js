import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("test");
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/participants', async function (req,res) {
    try {
		await mongoClient.connect();
        const user = req.body;
        const userSchema = joi.object({
            name: joi.string().required()
        });
        const validation = userSchema.validate(user, { abortEarly: true });
        if (validation.error) {
            return res.status(422).send('Digite o seu nome corretamente!');
        }
        await db.collection("users").findOne({
            name: user.name
        }).then(user => {
            if(!user){}else{
                return res.status(409).send('Esse nome já esta sendo utilizado, digite outro!'); 
            }
        });
        db.collection("users").insertOne({
            name: user.name,
            lastStatus: Date.now()
        });
        db.collection("users-in").insertOne({
            from: user.name, 
            to: 'Todos',
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format('HH:mm:ss')
        }) 

        return res.status(201).send(); 
	 } catch (error) {
	    res.status(500).send('Não foi possível conectar ao servidor!');
		mongoClient.close();
	 }
});


app.listen(5000);
