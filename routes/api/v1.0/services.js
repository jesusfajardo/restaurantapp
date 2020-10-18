var express = require('express');
const multer = require('multer');
var router = express.Router();
var fs = require('fs');
var _ = require("underscore");

var Img = require("../../../database/collections/img");

var Menus = require("../../../database/collections/../../database/collections/menus");
var Orden = require("../../../database/collections/../../database/collections/orden");
var Restaurant = require("../../../database/collections/../../database/collections/restaurant");
var Cliente = require("../../../database/collections/../../database/collections/cliente");
var Users = require("../../../database/collections/../../database/collections/users");
var Detalle = require("../../../database/collections/../../database/collections/detalle");

var jwt = require("jsonwebtoken");


const storage = multer.diskStorage({
  destination: function (res, file, cb) {
      try {
          fs.statSync('./public/avatars');
      } catch (e) {
          fs.mkdirSync('./public/avatars');
      }

      cb(null, './public/avatars');
  },
  filename: (res, file, cb) => {

      cb(null, 'IMG-' + Date.now() + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      return cb(null, true);
  }
  return cb(new Error('Solo se admiten imagenes png y jpg jpeg'));
}

const upload = multer({
  storage: storage,
  
})

/*
Login USER
*/
router.post("/login", (req, res, next) => {
  var email = req.body.email;
  var password = req.body.password;
  var result = Cliente.findOne({email: email,password: password}).exec((err, doc) => {
    if (err) {
      res.status(300).json({
        msn : "No se puede concretar con la peticion "
      });
      return;
    }
    console.log(doc);
    if (doc) {
       console.log(result);
      //res.status(200).json(doc);
      jwt.sign({name: doc.email, password: doc.password}, "secretkey123", (err, token) => {
          console.log(result);
          res.status(200).json({
            resp:200,
            token : token,
            dato:doc
          });
      })
    } else {
      res.status(400).json({
        resp: 400,
        msn : "El usuario no existe ne la base de datos"
      });
    }
  });
});
//Middelware
function verifytoken (req, res, next) {
  //Recuperar el header
  const header = req.headers["authorization"];
  if (header  == undefined) {
      res.status(403).json({
        msn: "No autorizado"
      })
  } else {
      req.token = header.split(" ")[1];
      jwt.verify(req.token, "secretkey123", (err, authData) => {
        if (err) {
          res.status(403).json({
            msn: "No autorizado"
          })
        } else {
          next();
        }
      });
  }
}
//CRUD Create, Read, Update, Delete
//Creation of users
router.post(/restaurantimg\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  upload(req, res, (err) => {
    if (err) {
      res.status(500).json({
        "msn" : "No se ha podido subir la imagen"
      });
    } else {
      var ruta = req.file.path.substr(6, req.file.path.length);
      console.log(ruta);
      var img = {
        idrestaurant: req.body.idrestaurant,
        name : req.file.originalname,
        physicalpath: req.file.path,
        relativepath: "http://localhost:8000" + ruta
      };
      var imgData = new Img(img);
      imgData.save().then( (infoimg) => {
        //content-type
        //Update User IMG
        var restaurant = {
          fotolugar: new Array()
        }
        Restaurant.findOne({_id:id}).exec( (err, docs) =>{
          //console.log(docs);
          var data = docs.fotolugar;
          console.log('data ', data);

          var aux = new  Array();
          if (data.length == 1 && data[0] == "") {
            Restaurant.fotolugar.push("/api/v1.0/restaurantimg/" + infoimg._id)
          } else {
            aux.push("/api/v1.0/restaurantimg/" + infoimg._id);
            data = data.concat(aux);
            Restaurant.fotolugar = data;
          }
          Restaurant.findOneAndUpdate({_id : id}, restaurant, (err, params) => {
              if (err) {
                res.status(500).json({
                  "msn" : "error en la actualizacion del usuario"
                });
                return;
              }
              res.status(200).json(
                req.file
              );
              return;
          });
        });
      });
    }
  });
});
router.get(/restaurantimg\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  console.log(id)
  Img.findOne({_id: id}).exec((err, docs) => {
    if (err) {
      res.status(500).json({
        "msn": "Sucedio algun error en el servicio"
      });
      return;
    }
    //regresamos la imagen deseada
    var img = fs.readFileSync("./" + docs.physicalpath);
    //var img = fs.readFileSync("./public/avatars/img.jpg");
    res.contentType('image/jpeg');
    res.status(200).send(img);
  });
});

/*RESTAURANT*/
router.post("/restaurant", (req, res) => {

  //Ejemplo de validacion
  var data = req.body;
  data ["registerdate"] = new Date();
  var newrestaurant = new Restaurant(data);
  newrestaurant.save().then((rr) =>{
    res.status(200).json({
      "resp": 200,
      "dato": newrestaurant,
      "id" : rr._id,
      "msn" :  "restaurante agregado con exito"
    });
  });
});
router.get("/restaurant",  (req, res) => {
  var skip = 0;
  var limit = "";
  if (req.query.skip != null) {
    skip = req.query.skip;
  }

  if (req.query.limit != null) {
    limit = req.query.limit;
  }
  Restaurant.find({}).skip(skip).limit(limit).exec((err, docs) => {
    if (err) {
      res.status(500).json({
        "msn" : "Error en la db"
      });

      return;
    }
    res.json({
      result : docs
    });
  });
});



//mostrar  por id los restaurant
router.get(/restaurant\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  Restaurant.findOne({_id : id}).exec( (error, docs) => {
    if (docs != null) {
        res.status(200).json(docs);
        return;
    }

  res.json({
    result : docs

    });
  })
});
//elimina un restaurant

router.delete('/restaurant/:id',  (req, res, )=> {
  var idRestaurant = req.params.id;

  Restaurant.findByIdAndRemove(idRestaurant).exec()
      .then(() => {
        res.status(200).json({
          "resp": 200,
          "msn" :  "eliminado con exito"
        });
      }).catch(err => {
          res.status(500).json({
              error: err
          });
      });


});
//Actualizar solo x elementos
router.patch(/restaurant\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  var keys = Object.keys(req.body);
  var restaurant = {};
  for (var i = 0; i < keys.length; i++) {
    restaurant[keys[i]] = req.body[keys[i]];
  }
  console.log(restaurant);
  Restaurant.findOneAndUpdate({_id: id}, restaurant, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos"
        });
        return;
      }
      res.status(200).json(params);
      return;
  });
});
//Actualiza los datos del restaurant
router.put(/restaurant\/[a-z0-9]{1,}$/, verifytoken,(req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  var keys  = Object.keys(req.body);
  var oficialkeys = ['nombre', 'nit', 'propiedad', 'calle', 'telefono', 'lat', 'lon'];
  var result = _.difference(oficialkeys, keys);
  if (result.length > 0) {
    res.status(400).json({
      "msn" : "error nose puede  actualizar  utilice patch  para la actualizar"
    });
    return;
  }

  var restaurant = {
    nombre : req.body.Nombre,
    nit : req.body.Nit,
    propiedad : req.body.Propiedad,
    calle : req.body.Calle,
    telefono : req.body.Telefono,
    lat : req.body.Lat,
    lon : req.body.Lon

  };
  Restaurant.findOneAndUpdate({_id: id}, restaurant, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos"
        });
        return;
      }
      res.status(200).json({
        "resp": 200,
        "dato": restaurant,
        "msn" :  "restaurant editado con exito"
      });
      return;
  });
});
router.post("/cliente",  (req, res) => {


  var data = req.body;
  data ["registerdate"] = new Date();
  var newcliente = new Cliente(data);
  newcliente.save().then((rr) =>{
    res.status(200).json({
      "resp": 200,
      "dato": newcliente,
      "msn" :  "cliente  agregado con exito"
    });
  });
});
router.get("/cliente",(req, res) => {
  var skip = 0;
  var limit = 10;
  if (req.query.skip != null) {
    skip = req.query.skip;
  }

  if (req.query.limit != null) {
    limit = req.query.limit;
  }
  Cliente.find({}).skip(skip).limit(limit).exec((err, docs) => {
    if (err) {
      res.status(500).json({
        "msn" : "Error en la db"
      });
      return;
    }
    res.json({
      result : docs
    });
  });
});

/*router.get("/cliente", (req, res, ) =>{
  Cliente.find({}).exec((error, docs) => {

    res.status(200).json({
      "msn" : "No existe el pedido "
    });
  });
});*/

router.get(/cliente\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  Cliente.findOne({_id : id}).exec( (error, docs) => {
    if (docs != null) {
        res.status(200).json(docs);
        return;
    }

    res.status(200).json({
      "msn" : "No existe el pedido "
    });
  });
});

//elimina un cliente
router.delete(/cliente\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  Cliente.find({_id : id}).remove().exec( (err, docs) => {
    res.json({
        message: "cliente eliminado"
        });
  });
});
//Actualizar solo x elementos
router.patch(/cliente\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split( "/")[4];
  var keys = Object.keys(req.body);
  var cliente = {
    nombre : req.body.nombre,
    ci : req.body.ci,
    telefono : req.body.telefono,
    email : req.body.email,

  };
  console.log(cliente);
  Cliente.findOneAndUpdate({_id: id}, cliente, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos"
        });
        return;
      }
      res.status(200).json({
        "resp": 200,
        "dato": cliente,
        "msn" :  "cliente  editado con exito"
      });
      return;
  });
});
//Actualiza los datos del cliente
router.put(/cliente\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  var keys  = Object.keys(req.body);
  var oficialkeys = ['nombre', 'ci', 'telefono', 'email',];
  var result = _.difference(oficialkeys, keys);
  if (result.length > 0) {
    res.status(400).json({
      "msn" : "erorr no se puede actualizar intenten con patch"
    });fmulter
    return;
  }
  var cliente = {
    nombre : req.body.nombre,
    ci : req.body.ci,
    telefono : req.body.telefono,
    email : req.body.email,

  };
  Cliente.findOneAndUpdate({_id: id}, cliente, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos"
        });
        return;
      }
      res.status(200).json({
        "resp": 200,
        "dato": cliente,
        "msn" :  "cliente  editado con exito"
      });
      return;
  });
});

//insertar datos de orden
router.post("/orden",  (req, res) => {


  var data = req.body;
  data ["registerdate"] = new Date();
  var neworden = new Orden(data);
  neworden.save().then((rr) =>{
    res.status(200).json({
      "resp": 200,
      "dato": neworden,
      "msn" :  "orden  agregado con exito"
    });
  });
});
router.get("/orden", (req, res, next) =>{
  Orden.find({}).populate("menus").populate("cliente").populate("restaurant").exec((error, docs) => {
    res.status(200).json(docs);
  });
});

// Read only one user
router.get(/orden\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  Orden.findOne({_id : id}).exec( (error, docs) => {
    if (docs != null) {
        res.status(200).json(docs);
        return;
    }

    res.status(200).json({

        "array_texto":
          {
            "texto":"<b>orden</b>",
            "texto":"registrado con exito"
          }


    });
  })
});
//elimina una orden
router.delete('/orden/:id', (req, res,) => {
  var idOrden = req.params.id;

  Orden.findByIdAndRemove(idOrden).exec()
      .then(() => {
          res.json({
              message: "orden eliminado"
          });
      }).catch(err => {
          res.status(500).json({
              error: err
          });
      });


});
//Actualizar solo x elementos
router.patch(/orden\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  var keys = Object.keys(req.body);
  var orden = {};
  for (var i = 0; i < keys.length; i++) {
    orden[keys[i]] = req.body[keys[i]];
  }
  console.log(orden);
  Orden.findOneAndUpdate({_id: id}, orden, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos"
        });
        return;
      }
      res.status(200).json({
        "resp": 200,
        "dato": orden,
        "msn" :  "orden  editado con exito"
      });
      return;
  });
});
//Actualiza los datos dela ordem
router.put(/orden\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  var keys  = Object.keys(req.body);
  var oficialkeys = ['idmenu', 'idrestaurant', 'cantidad', 'idcliente', 'lat', 'lon', 'pagototal'];
  var result = _.difference(oficialkeys, keys);
  if (result.length > 0) {
    res.status(400).json({
      "msn" : "Existe un error en el formato de envio puede hacer uso del metodo patch si desea editar solo un fragmentode la informacion"
    });
    return;
  }

  var orden = {
    menu : req.body.idmenu,
    restaurant : req.body.idrestaurant,
    cliente : req.body.idcliente,
    lugar_envio : req.body.lugar_envio,
    cantidad : req.body.cantidad,
    precio : req.body.precio,
    pagototal : req.body.pagototal
  };
  Orden.findOneAndUpdate({_id: id}, orden, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos de la orden"
        });
        return;
      }
      res.status(200).json({
        "resp": 200,
        "dato": orden,
        "msn" :  "orden  editado con exito"
      });
      return;
  });
});
//insertar datos de] menu
router.post("/detalle",  (req, res) => {

  //Ejemplo de validacion
  var data = req.body;
  data ["registerdate"] = new Date();
  var newdetalle = new Detalle(data);
  newdetalle.save().then((rr) =>{
    res.status(200).json({
      "resp": 200,
      "dato": newrestaurant,
      "id" : rr._id,
      "msn" :  "pedidos agregado con exito"
    });
  });
});
router.get("/pedidos",(req, res) => {
  var skip = 0;
  var limit = 10;
  if (req.query.skip != null) {
    skip = req.query.skip;
  }

  if (req.query.limit != null) {
    limit = req.query.limit;
  }
  Pedidos.find({}).skip(skip).limit(limit).exec((err, docs) => {
    if (err) {
      res.status(500).json({
        "msn" : "Error en la db"
      });
      return;
    }
    res.json({
      result : docs
  });
});



//mostrar  por id detalle
router.get(/pedidos\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  Pedidos.findOne({_id : id}).exec( (error, docs) => {
    if (docs != null) {
        res.status(200).json(docs);
        return;
    }

    res.json({
      result : docs    });
  })
});
//elimina un restaurant
router.delete('/detalle/:id',  (req, res, )=> {
  var idDetalle = req.params.id;

  Orden.findByIdAndRemove(idOrden).exec()
      .then(() => {
          res.json({
              message: "Orden eliminado"
          });
      }).catch(err => {
          res.status(500).json({
              error: err
          });
      });


});
//Actualizar solo x elementos
router.patch(/pedidos\/[a-z0-9]{1,}$/, (req, res) => {
  var url = req.url;
  var id = url.split("/")[2];
  var keys = Object.keys(req.body);
  var pedidos = {};
  for (var i = 0; i < keys.length; i++) {
    pedidos[keys[i]] = req.body[keys[i]];
  }
  console.log(restaurant);
  Pedidos.findOneAndUpdate({_id: id}, pedidos, (err, params) => {
      if(err) {
        res.status(500).json({
          "msn": "Error no se pudo actualizar los datos"
        });
        return;
      }

      res.status(200).json({
        "resp": 200,
        "dato": orden,
        "msn" :  "orden  editado con exito"
      });
      return;

      });
  });
});

module.exports = router;