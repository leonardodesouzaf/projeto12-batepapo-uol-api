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
        let haveAlready = true;
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
            if(!user){
                haveAlready = false;
            }else{
                return res.status(409).send('Esse nome já está sendo utilizado, digite outro!'); 
            }
        });
        if(haveAlready === false){
            db.collection("users").insertOne({
                name: user.name,
                lastStatus: Date.now()
            });
            db.collection("messages").insertOne({
                from: user.name, 
                to: 'Todos',
                text: 'entra na sala...', 
                type: 'status', 
                time: dayjs().format('HH:mm:ss')
            });
        }
        return res.status(201).send(); 
	 } catch (error) {
	    res.status(500).send('Não foi possível conectar ao servidor!');
		mongoClient.close();
	 }
});

app.get('/participants', async function (req,res) {
    try {
        await mongoClient.connect();
        await db.collection("users").find().toArray().then(usersArray => {
            res.send(usersArray);
        });
        return res.status(201).send(); 
     } catch (error) {
        res.status(500).send('Não foi possível conectar ao servidor!');
        mongoClient.close();
     }
});

app.post('/messages', async function (req,res) {
    try {
		await mongoClient.connect();
        const message = req.body;
        const user = req.headers.user;
        let haveAlready = false;
        const userSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.valid('message').valid('private_message').optional()
        });
        const validation = userSchema.validate(message, { abortEarly: true });
        if (validation.error) {
            return res.status(422).send('Digite a mensagem corretamente!');
        }
        await db.collection("users").findOne({
            name: user
        }).then(user => {
            if(!user){
                return res.status(422).send('Remetente não está na sala!');
            }else{
                haveAlready = true;
            }
        });
        if(haveAlready === true){
            db.collection("messages").insertOne({
                from: user, 
                to: message.to,
                text: message.text, 
                type: message.type, 
                time: dayjs().format('HH:mm:ss')
            });
        }
        return res.status(201).send(); 
	 } catch (error) {
	    res.status(500).send('Não foi possível conectar ao servidor!');
		mongoClient.close();
	 }
});

app.get('/messages', async function (req,res) {
    try {
		await mongoClient.connect();
        const user = req.headers.user;
        let haveAlready = false;
        const limit = parseInt(req.query.limit)*-1;
        await db.collection("users").findOne({
            name: user
        }).then(user => {
            if(!user){
                return res.status(422).send('Você não está na sala!');
            }else{
                haveAlready = true;
            }
        });
        if(haveAlready === true){
            if(!limit){
                await db.collection("messages").find({$or: [{from: user, type: 'private_message'},{to: user},{type: 'message'},{type: 'status'}] }).toArray().then(messagesArray => {
                    res.send(messagesArray.reverse());
                });
            }else{
                await db.collection("messages").find({$or: [{from: user, type: 'private_message'},{to: user},{type: 'message'},{type: 'status'}] }).toArray().then(messagesArray => {
                    res.send(messagesArray.slice(limit).reverse());
                });
            }
        }
        return res.status(201).send(); 
	 } catch (error) {
	    res.status(500).send('Não foi possível conectar ao servidor!');
		mongoClient.close();
	 }
});

app.post('/status', async function (req,res) {
    try {
		await mongoClient.connect();
        const user = req.headers.user;
        let haveAlready = false;
        let lastStatus;
        let userId;
        await db.collection("users").findOne({
            name: user
        }).then(user => {
            if(!user){
                return res.status(404).send();
            }else{
                userId = user._id;
            }
        });
        await db.collection("users").findOne({
            _id: userId
        }).then(user => {
            if(!user){
                return res.status(404).send();
            }else{
                lastStatus = user.lastStatus;
                haveAlready = true;
            }
        });
        if(haveAlready === true){
            await db.collection("users").updateOne({ 
                _id: userId
            }, { $set: {lastStatus: Date.now()} });
        }
        return res.status(200).send(); 
	 } catch (error) {
	    res.status(500).send('Não foi possível conectar ao servidor!');
		mongoClient.close();
	 }
});

setInterval(async() => {
    await db.collection("users").find().toArray().then(usersArray => {
        usersArray.forEach(user => {
            if((Date.now()-user.lastStatus)>10000){
                db.collection("users").deleteOne({ _id: user._id });
                db.collection("messages").insertOne({
                    from: user.name, 
                    to: 'Todos', 
                    text: 'sai da sala...', 
                    type: 'status',
                    time: dayjs().format('HH:mm:ss')
                });
            }
        });
    });
},15000);



app.listen(5000);
