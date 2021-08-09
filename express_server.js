const express = require('express');
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');

const { getUserByEmail } = require('./helpers');

const bcrypt = require('bcrypt');
const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
}));

function generateRandomString() {
  return Math.random().toString(36).substr(2, 6);
}

// Function to return urls based on user ID.
const urlsForUser = function(id) {
  const urls = {};

  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id){
      urls[shortURL] = urlDatabase[shortURL];
    }
  }
  return urls;
}

const urlDatabase = {
  b6UTxQ: {
      longURL: "https://www.tsn.ca",
      userID: "aJ48lW"
  },
  i3BoGr: {
      longURL: "https://www.google.ca",
      userID: "aJ48lW"
  }
};

const users = {};

app.get('/', (req, res) => {
  if (req.session.userID) {
    res.redirect('/urls');
  }
  
  res.redirect('/login');
});

app.get('/urls', (req, res) => {
  const templateVars = { 
    urls: urlsForUser(req.session.user_id),
    user: users[req.session.user_id]
  }

  res.render('urls_index', templateVars);
});

app.get("/register", (req, res) => {
  const templateVars = {
    user: users[req.session.user_id]
  };
  res.render('register', templateVars);
})

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.post("/urls", (req, res) => {
  if (req.session.user_id) {
    const shortURL = generateRandomString();
  
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: req.session.user_id
    }
  
    res.redirect(`urls/${shortURL}`);

  } else {
    res.status(401).send('You have to login to do that.');
  }
});

app.get('/hello', (req, res) => {
  res.send('<html><body>Hello <b>World</b></body></html>\n');
});

app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    res.redirect('/login');
  } else {
    const templateVars = { 
      user: users[req.session.user_id],
    }
    res.render('urls_new', templateVars);
  }
});

app.get('/urls/:shortURL', (req, res) => {
  const templateVars = { 

    shortURL: req.params.shortURL, 
    longURL: urlDatabase[req.params.shortURL].longURL, 
    user: users[req.session.user_id],
    urlUserID: urlDatabase[req.params.shortURL].userID

  };
  const urls = urlsForUser(req.session.user_id, urlDatabase);
  
  if (!req.session.user_id || !urls[req.params.shortURL]) {
    res.send(404, 'This is not your URL.');
  } 

  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const shortURL = urlDatabase[req.params.shortURL];
  
  if (!shortURL) {
    res.send(404, 'Short URL does not exist.');
  }
  
  res.redirect(shortURL.longURL);
});

app.get("/login", (req, res) => {
  let templateVars = {
    user: users[req.session.user_id],
  };
  res.render("urls_login", templateVars);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const id = req.session.user_id;
  const urls = urlsForUser(id);

  if (Object.keys(urls).includes(req.params.shortURL)){
    delete urlDatabase[req.params.shortURL];
    res.redirect('/urls');
  } else {
    res.send(401);
  }
});

app.post("/urls/:shortURL", (req, res) => { 
  const id = req.session.user_id;
  const urls = urlsForUser(id);
  
  if (Object.keys(urls).includes(req.params.shortURL)){
    const shortURL = req.params.shortURL;
    urlDatabase[shortURL].longURL = req.body.newURL;
    res.redirect('/urls');
  } else {
    res.send(401);
  }
});

app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = bcrypt.hashSync(req.body.password, 10);

  if (!email || !password) {
    res.send(400, 'Email and password required');
  };

  if (getUserByEmail(email, users)){
    res.send(400, 'User already exists')
  };

  const id = generateRandomString();
  users[id] = { id, email, password };

  req.session.user_id = id;
  res.redirect('/urls');
})

app.post("/login", (req, res) => {
  const email = req.body.email;
  const enteredPass= req.body.password;

  if (!getUserByEmail(email, users)){
    res.send(403, 'Account not found.');
  } 
  const userId = getUserByEmail(email, users);

  if(!bcrypt.compareSync(enteredPass, users[userId].password)) {
      res.send(403, 'Wrong Password');
  } else {
    req.session.user_id = userId;
    res.redirect('/urls');
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`); 
});