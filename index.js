const express = require("express");
const app = express();
const pg = require("pg");
const bodyParser = require("body-parser")
const multer = require("multer")
const flash = require("connect-flash");
const passPort = require("passport");
const session = require("express-session");
const accepts = require('accepts');
const LocalStrategy = require("passport-local").Strategy
const fs = require("fs");
// const loginLocal = require("./api/login/loginLocal")
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/upload')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const upload = multer({ storage: storage }).single("uploadfile")
const config = {
  user: "postgres",
  database: "upload",
  password:"trunganh123",
  host:"localhost",
  port:5432,
  max:10,
  idleTimeoutMillis: 30000 ,
};
const pool = new pg.Pool(config);
const port = process.env.PORT || 3000;
const urlencodedParser = bodyParser.urlencoded({extended: true})
app.use(flash());
app.use(session({
  secret: "mysecet",
  cookie: {
    maxAge: 1000*60*5
  }
}))

app.use(passPort.initialize());
app.use(passPort.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views","./views");

app.get("/",(req,res)=>{
  pool.connect((err,client,done)=>{
    if(err){
      return console.error("error fetching client",err)
    }
    client.query("select * from video",(err,result)=>{
      done();
      if(err){
        res.end();
        return console.error("errorr running query",err)
      }
      res.render("home",{data:result});
    })
  })
})

app.route("/admin")
  .get((req, res) => {
    const messages = req.flash('error');
    const messagese = req.flash('error');
    res.render("login", {
      messages: messages,
      messagese: messagese

    })
  })
  .post(passPort.authenticate("local", {
    failureRedirect: "/admin",
    successRedirect: "/video/list",
    failureFlash: true
  }))
  app.get("/video/list", (req, res,next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.render("loginpro")
    }
  })
  app.get("/video/list",(req,res)=>{
    pool.connect((err,client,done)=>{
      if(err){
        return console.error("error fetching client",err)
      }
      client.query("select * from video",(err,result)=>{
        done();
        if(err){
          res.end();
          return console.error("errorr running query",err)
        }
        res.render("list",{data:result});
      })
    })
  })
  app.get("/video/delete/:id", (req, res,next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.render("loginpro")
    }
  })
  app.get("/video/delete/:id",(req,res)=>{
    pool.connect((err,client,done)=>{
      if(err){
        return console.error("error fetching client",err)
      }
      client.query("delete from video where id="+ req.params.id,(err,result)=>{
        done();
        if(err){
          res.end();
          return console.error("errorr running query",err)
        }
        res.redirect("../../video/list")
      })
    })
  })
  app.get("/video/add", (req, res,next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.render("loginpro")
    }
  })
  app.get("/video/add",(req,res)=>{
    res.render("add");
  })
  app.post("/video/add",urlencodedParser,(req,res)=>{
    upload(req,res,(err)=>{
      if(err){
        res.send("Lỗi")
      }else{
        if(req.file == undefined){
          res.send("File Chưa Được Chọn")
        }else{
          pool.connect((err,client,done)=>{
            if(err){
              return console.error("error fetching client",err)
            }
            const sql = "insert into video (tieude,mota,key,image) values('"+req.body.tieude+"','"+req.body.mota+"','"+req.body.key+"','"+req.file.originalname+"')";
            client.query(sql,(err,result)=>{
              done();
              if(err){
                res.end();
                return console.error("errorr running query",err)
              }
              res.redirect("./list")
            })
          })
        }
      }
    })
  })
  app.get("/video/edit/:id", (req, res,next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.render("loginpro")
    }
  })
  app.get("/video/edit/:id",(req,res)=>{
    const id = req.params.id;
    pool.connect((err,client,done)=>{
      if(err){
        return console.error("error fetching client",err)
      }
      client.query('SELECT * FROM video WHERE id ='+id,(err,result)=>{
        done();
        if(err){
          res.end();
          return console.error("errorr running query",err)
        }
        res.render("edit",{data:result.rows[0]});
      })
    })
  })
  app.post("/video/edit/:id",urlencodedParser,(req,res)=>{
    const id = req.params.id;
    upload(req,res,(err)=>{
      if(err){
        res.send("Xảy Ra Lỗi Trong Quá Trình Upload File")
      }else{
        if(typeof(req.file)== 'undefined'){
          pool.connect((err,client,done)=>{
            if(err){
              return console.error("error fetching client",err)
            }
            client.query("UPDATE video set tieude='"+req.body.tieude+"', mota='"+req.body.mota+"', key='"+req.body.key+"' WHERE id="+id,(err,result)=>{
              done();
              if(err){
                res.end();
                return console.error("errorr running query",err)
              }

              res.redirect("../list")
            })
          })
        }else{
          pool.connect((err,client,done)=>{
            if(err){
              return console.error("error fetching client",err)
            }
            client.query("UPDATE video set tieude='"+req.body.tieude+"',mota='"+req.body.mota+"',key='"+req.body.key+"',image='"+req.file.originalname+"' WHERE id="+id,(err,result)=>{
              done();
              if(err){
                res.end();
                return console.error("errorr running query",err)
              }
              res.redirect("../list")
            })
          })
        }
      }
    })
  })

passPort.use(new LocalStrategy((username, password, done) => {
  fs.readFile("./userDB.json", (err, data) => {
    const db = JSON.parse(data)
    const userRecord = db.find((user) => {
      return user.usr == username
    })
    if (!userRecord) {
      return done(null, false, {
        message: "Email Chưa Chính Xác"
      })
    } else if (userRecord.pwd == password) {
      return done(null, userRecord)
    } else {
      return done(null, false, {
        message: "Password Chưa Chính Xác"
      })
    }
    // if(userRecord && userRecord.pwd == password){
    //   return done(null,userRecord)
    // }else{
    //
    //   //return done(null,false)
    //   return done(null,false,{ message: " P Không đúng" })
    // }
  })
}))

passPort.serializeUser((user, done) => {
  return done(null, user.usr)
})
passPort.deserializeUser((name, done) => {
  fs.readFile("./userDB.json", (err, data) => {
    const db = JSON.parse(data)
    const userRecord = db.find((user) => {
      return user.usr = name
    })
    if (userRecord) {
      return done(null, userRecord)
    } else {
      return done(null, false)
    }
  })
})
app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect('/');
})
app.use(function(req, res, next) {
    res.status(404).render('404');
});
app.listen(port,()=>{
  console.log("Connect Done: ",port);
})
