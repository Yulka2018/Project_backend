const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const Sequelize = require ('sequelize');
const bcrypt = require('bcrypt');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');


app.use(cors());
app.use(bodyParser.json());




const sequelize = new Sequelize('mysql://root:1124567@localhost/wml2');

class Categories extends Sequelize.Model{}
Categories.init({
  name: Sequelize.STRING,
  costs: Sequelize.BOOLEAN,
  income: Sequelize.BOOLEAN
}, {sequelize});

class Income extends Sequelize.Model{}
Income.init({
  date: Sequelize.DATEONLY,
  incomeSum: Sequelize.NUMERIC,
  comment: Sequelize.STRING,
}, {sequelize});

class Costs extends Sequelize.Model{}
Costs.init({
  date: Sequelize.DATEONLY,
  costsSum: Sequelize.NUMERIC,
  comment: Sequelize.STRING,
}, {sequelize});

class User extends Sequelize.Model{}
User.init({
    nick: Sequelize.STRING,
    email: Sequelize.STRING,
    pass: Sequelize.STRING,
}, { sequelize });

Categories.hasMany(Income);
Income.belongsTo(Categories);
Income.belongsTo(User);
Categories.hasMany(Costs);
Costs.belongsTo(Categories);
Costs.belongsTo(User);

sequelize.sync();
console.log (Costs.prototype)

const config = {
  secret: `buhfghtcnjkjd` //тот самый секретный ключ, которым подписывается каждый токен, выдаваемый клиенту
}

function jwtWare() {
  const { secret } = config;
  console.log(config, secret)
  return expressJwt({ secret }).unless({ //блюдет доступ к приватным роутам
      path: [
          // public routes that don't require authentication
          '/users', '/authenticate', '/categories',
      ]
  });
}
  


function errorHandler(err, req, res, next) {
  if (typeof (err) === 'string') {
      // custom application error
      return res.status(400).json({ message: err });
  }

  if (err.name === 'UnauthorizedError') { //отлавливает ошибку, высланную из expressJwt
      // jwt authentication error
      return res.status(401).json({ message: 'Invalid Token' });
  }

  // default to 500 server error
  return res.status(500).json({ message: err.message });
}

app.use(jwtWare());

function decoded(req){
  let a = req.headers.authorization
  let token = a.split(' ')[1]
  //console.log(token)
  let decoded = jwt.decode(token, {complete: true});
//console.log(decoded);
let id = decoded.payload.sub
return id
}

app.post('/income', async function(req, res){
  console.log(req.body);
// sequelize.sync();
  let income = await Income.create({
    date: req.body.date,
    incomeSum: req.body.sum,
    comment: req.body.comment
  });
  let [categories, isCreate] = await Categories.findOrCreate({where: {name: req.body.categories}});
  await income.setCategory(categories);
  let user = await User.findOne({where: {nick : req.body.user}})
  await income.setUser(user)
  res.status(201).send(req.body);
})

app.get('/income', async function(req, res){
  let id = await decoded(req)
  res.send(await Income.findAll({where: {UserId: id}, include:[Categories]}))
})


app.post('/costs', async function(req, res){
  let costs = await Costs.create({
    date: req.body.date,
    costsSum: req.body.sum,
    comment: req.body.comment
  });
  let [categories, isCreate] = await Categories.findOrCreate({where: {name: req.body.categories}});
   await costs.setCategory(categories);
    let user = await User.findOne({where: {nick : req.body.user}})
  await costs.setUser(user)
  res.status(201).send(req.body);
})

app.put('/costs' , async function (req, res){
  console.log(req.body)
  let [categories, isCreate] = await Categories.findOne({where: {name: req.body.categories}});
  let cost = await Costs.update( {CategoryId: categories.id, costsSum: req.body.sum },{
    where: {id: req.body.id}
  })
  res.status(201).send(cost)
})

app.get('/costs', async function(req, res){
  let id = await decoded(req)
  res.send(await Costs.findAll({where: {UserId: id}, include:[Categories]}))
})

app.post('/categories', async function(req, res){
  //console.log(req.body)
  await Categories.findOrCreate({where: {
    name: req.body.categories,
    costs: req.body.costs,
    income: req.body.income,
    }
  })
  res.status(201).send(req.body);
})


app.get('/categories', async function(req, res){
  res.send(await Categories.findAll())
})

app.post('/users', async function(req,res){
  sequelize.sync();
  //console.log(req.body.pass)
  let hash = async (password) => {
      let salt = await bcrypt.genSaltSync(10);
      return await bcrypt.hash(req.body.pass, salt)
  }
  let hashPass = await hash(req.body.pass)
  let userFind = await User.findOne({where: {nick: req.body.nick}})
  userFind ? res.status(400).json({message: 'Nick is already in use.'}):
  await User.create({
      nick: req.body.nick,
      email: req.body.email,
      pass: hashPass,
  })
  res.json({message: 'Congratulation!!!!'})
})

async function authenticate({ nick, pass }) { //контроллер авторизации
  //console.log(nick, pass)
  let user = await User.findOne({ where: {nick: nick }})
  if (user){
  let isValidPass = await bcrypt.compare(pass, user.pass)
   if (isValidPass) {
       const token = jwt.sign({ sub: user.id }, config.secret); //подписывам токен нашим ключем
       const {id, nick, email, ...rest} = user
      // console.log()
       return { //отсылаем интересную инфу
           nick, email,
           token
       };
   }
  }

  }

app.use(bodyParser.urlencoded({ extended: false }));


app.post('/authenticate', function (req, res, next) {
   authenticate(req.body)
       .then(user => user ? res.json(user)
        : res.status(400).json({ message: 'Username or password is incorrect' }))
       .catch(err => next(err));
});

app.get('/', (req, res, next) => {
   res.json({all: 'ok'})
   //next()
});

app.use(errorHandler);

app.listen(8000, function () {
  console.log('Example app listening on port 8000!');
});