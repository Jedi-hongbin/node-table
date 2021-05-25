const express = require("express");
const fs = require("fs");
const mysql = require("mysql");
const path = require("path");

const app = express();

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const PRODUCTION = process.env.NODE_ENV == "production";

const db = mysql.createPool({
  host: "159.75.22.82:3306",
  user: "root",
  password: "136136",
  database: "HData",
  port: 3306, //端口号默认3306，不写即默认
});

app.all("*", function (req, res, next) {
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin", "*");
  //允许的header类型
  res.header("Access-Control-Allow-Headers", "content-type");
  //跨域允许的请求方式
  res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
  if (req.method.toLowerCase() == "options") res.status(200).send();
  //让options尝试请求快速结束
  else next();
});

// //上传图片
// app.post("/uploadImage", function (req, res) {
//   //接收前台POST过来的base64
//   var imgData = req.body.imgData;
//   //过滤data:URL
//   var base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
//   var dataBuffer = new Buffer(base64Data, "base64");
//   fs.writeFile("image.png", dataBuffer, function (err) {
//     if (err) {
//       res.send(err);
//     } else {
//       res.send("保存成功！");
//     }
//   });
// });

//删除数据
app.post("/delete", (req, res) => {
  const { tableName, id } = req.body;
  console.log(tableName, id);

  const sql = `
  DELETE FROM ${tableName}
  WHERE id = '${id}'
  `;
  console.log("sql:", sql);

  db.query(sql, function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else {
      console.log("success:", data);
      res.json(data);
    }
  });
});
//更新数据
app.post("/update", (req, res) => {
  const { tableName, id, ...data } = req.body;
  console.log(tableName, id, data);
  //生成 SET 语句
  let setField = [];
  for (const [key, value] of Object.entries(data)) {
    setField.push(`${key} = '${value}'`);
  }

  const sql = `
  UPDATE ${tableName}
  SET ${setField.join(",")}
  WHERE id = '${id}'
  `;

  console.log("sql:", sql);

  db.query(sql, function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else {
      console.log("success:", data);
      res.json(data);
    }
  });
});

//向表中插入数据
app.post("/insertInto", function (req, res) {
  const { tableName, ...data } = req.body;
  console.log(tableName, data);
  const columns = [];
  const values = [];

  for (const [key, value] of Object.entries(data)) {
    if (key == "age") values.push(value);
    else values.push(`'${value}'`);
    columns.push(key);
  }

  const sql = `
  INSERT INTO ${tableName} (${columns.join()})
  VALUES (${values.join()});
  `;
  console.log("sql", sql);

  db.query(sql, function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else {
      console.log("success:", data);
      res.json(data);
    }
  });
});

app.get("/selectTable", (req, res) => {
  const { tableName } = req.query;
  db.query(`SELECT * FROM ${tableName};`, function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else res.send(data);
  });
});

app.get("/selectTableColumns", (req, res) => {
  const { tableName } = req.query;
  const sql = `
  select column_name,data_type
  from information_schema.columns
  where table_name='${tableName}' and table_schema='HData';
  `;
  db.query(sql, function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else res.send(data);
  });
});

app.get("/userList", (req, res) => {
  db.query("SELECT * FROM `user`;", function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else res.send(data);
  });
});

app.get("/showTables", (req, res) => {
  db.query("SHOW TABLES;", function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else {
      const propName = "Tables_in_HData";
      const tables = data.map((table) => table[propName]);
      console.log(tables);
      res.send(tables);
    }
  });
});

app.get("/selectDataBase", (req, res) => {
  db.query("SELECT DATABASE()", function (err, data) {
    if (err) {
      console.error(err);
      res.status(411).send(JSON.stringify(err.sqlMessage));
    } else res.send(data);
  });
});

app.use("/", (req, res, next) => {
  let pathName = req.url;
  console.log(pathName);
  // if (pathName != "/favicon.ico") {
  // 提供一个 icon就不会发起/favicon.ico的请求了
  if (pathName == "/") {
    pathName = "/index.html";
  }

  const extName = path.extname(pathName);
  fs.readFile(`../client${pathName}`, function (err, data) {
    if (err) {
      console.error(err);
      res.status(400).json(err);
    } else {
      const ext = getExt(extName);
      res.writeHead(200, { "Content-Type": ext + "; charset=utf-8" });
      res.write(data);
    }
    res.end();
  });
  // }
});

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(80, () => {
  console.log(process.env.NODE_ENV, PRODUCTION);
});

// 获取后缀名
getExt = (extName) => {
  switch (extName) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "text/js";
    case ".ico":
      return "image/x-icon";
    case ".png":
      return "image/png";
    default:
      return "text/html";
  }
};
