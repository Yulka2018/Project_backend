const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const Sequelize = require ('sequelize');


app.use(cors());
app.use(bodyParser.json());




const sequelize = new Sequelize('mysql://root:1124567@localhost/wml');

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
}, {sequelize});

class Costs extends Sequelize.Model{}
Costs.init({
  date: Sequelize.DATEONLY,
  costsSum: Sequelize.NUMERIC,
}, {sequelize});

Categories.hasMany(Income);
Income.belongsTo(Categories);
Categories.hasMany(Costs);
Costs.belongsTo(Categories);

sequelize.sync();
// console.log (Costs.prototype)

app.post('/income', async function(req, res){
  console.log(req.body);

  // sequelize.sync();
  let income = await Income.create({
    date: req.body.date,
    incomeSum: req.body.sum,
  });
  let [categories, isCreate] = await Categories.findOrCreate({where: {name: req.body.categories, costs: req.body.costs,
    income: req.body.income}});
  await income.setCategory(categories);

  res.status(201).send(req.body);
});

app.get('/income', async function(req, res){
  res.send(await Income.findAll())
})


app.post('/costs', async function(req, res){
  console.log(req.body)
  let costs = await Costs.create({
    date: req.body.date,
    costsSum: req.body.sum,
  });
  let [categories, isCreate] = await Categories.findOrCreate({where: {name: req.body.categories, costs: req.body.costs,
    income: req.body.income}});
  await costs.setCategory(categories);

  res.status(201).send(req.body);
})

app.get('/costs', async function(req, res){
  res.send(await Costs.findAll({include: [Categories]}))
})

app.post('/categories', async function(req, res){
  await Categories.findOrCreate({
    name: req.body.categories,
    costs: req.body.costs,
    income: req.body.income,
  })
})


app.get('/categories', async function(req, res){
  res.send(await Categories.findAll())
})


app.listen(8000, function () {
  console.log('Example app listening on port 8000!');
});
