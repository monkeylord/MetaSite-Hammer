const crypto = require('crypto')
const fs = require('fs')
const explorer = require('bitcore-explorers')
const Insight = explorer.Insight
const insight = new explorer.Insight('https://api.bitindex.network')
const bsv = require('bsv')
const MimeLookup = require('mime-lookup');
const mime = new MimeLookup(require('mime-db'));
const ibe = require('bitcoin-ibe')
const fetch = require('node-fetch')

bsv.PrivateKey.prototype.childKey = function (id, harden) {
  return ibe.CKDpriv_add(this, id, harden)
}

bsv.PublicKey.prototype.childKey = function (id, harden) {
  return ibe.CKDpub_add(this, id, harden)
}

function Hammer(opts){
  if (!(this instanceof Hammer)) {
    return new Hammer(opts)
  }
  opts = opts || {}
  var api = opts.api || 'https://api.bitindex.network'
  this.insight = new Insight(api)
  this.bitdb = opts.bitdb || 'https://genesis.bitdb.network/q/1FnauZ9aUH2Bex6JzdcV4eNX7oLSSEbxtN/'
  this.bitdbKey = opts.bitdbKey || ['159bcdKY4spcahzfTZhBbFBXrTWpoh4rd3']
  var privKey = opts.privKey || opts.privateKey || ""
  if(privKey=="")throw new Error("Must Provide Private Key")
  this.privKey = bsv.PrivateKey(privKey)
  this.path = opts.path || './public'
  this.utxos = null
  this.sitemap = null
  this.files = null
  this.maptx = null
  this.fileTXs = null
  this.unBroadcastedTXs = []
  return this
}

Hammer.prototype.throwout = function(){
    console.log("[+]Indexing files in " + this.path)
    return this.index().then(()=>{
        console.log("[+]Searching existing files on blockchain")
        return this.reduceSitemap()
    }).then(()=>{
        console.log("[+]Building upload transactions")
        return this.build()
    }).then(()=>{
        console.log("[+]Saving Sitemap to sitemap.json")
        this.saveSitemap()
        console.log("[+]Broadcasting upload transactions")
        return this.broadcast()
    }).then(()=>{
        console.log("[+]Hammer Threw")
    }).catch((err)=>{
        console.log(err)
    })
}

Hammer.prototype.index = function(){
    return new Promise((resolve, reject)=>{
        this.getFiles()
        this.prepareSitemap()
        resolve()
    })
}
Hammer.prototype.build = function(){
    return this.getUtxos().then(()=>{
        if(!this.sitemap)throw new Error("No Sitemap found")
        this.buildMapTX()
        if(this.maptx.getFee()<this.maptx.toString().length)throw new Error("Insuffient Satoshis")
        this.buildFileTXs()
        return
    })
}

Hammer.prototype.broadcast = function(){
    return new Promise((resolve, reject)=>{
        if(this.fileTXs.length<1)reject("No broadcast needed")
        insight.broadcast(this.maptx.toString(),(err,res)=>{
            if(err){
                console.log(" Insight API return Errors: ")
                console.log(err)
                reject("Insight API return Errors: " + err)
            }else resolve()
        })
    }).then(()=>{
        return Promise.all(this.fileTXs.map((fileTX)=>{
                return new Promise((resolve,reject)=>{
                    console.log(" Broadcasting "+fileTX.hash)
                    insight.broadcast(fileTX.toString(),(err,res)=>{
                        if(err){
                            console.log(" Failed to broadcast " + fileTX.hash + ", Code: " + err.message.code + " reason:" + err.message.message.slice(0,100))
                            //fs.writeFileSync(fileTX.hash,fileTX.toString())
                            this.unBroadcastedTXs.push({TXID:fileTX.hash,TX:fileTX.toString(),reason:err.message})
                            resolve()
                        }else{
                            console.log(" " + fileTX.hash + " Broadcasted")
                            resolve()
                        }
                    })
                })
            })
        )
    }).then(()=>{
        if(this.unBroadcastedTXs.length>0){
            console.log(" unBroadcasted TXs: "+this.unBroadcastedTXs.length)
            fs.writeFileSync("TXs.unBroadcasted.json",JSON.stringify(this.unBroadcastedTXs))
            console.log(" unBroadcasted TXs are saved to TXs.unBroadcasted.json")
        }else console.log(" All TX Broadcasted")
    })
}

Hammer.prototype.broadcast_continue = function(){
    console.log("[+]Broadcasting TXs in TXs.unBroadcasted.json")
    var TXs = JSON.parse(fs.readFileSync("TXs.unBroadcasted.json"))
    return Promise.all(TXs.map((fileTX)=>{
                return new Promise((resolve,reject)=>{
                    console.log(" Broadcasting "+fileTX.TXID)
                    insight.broadcast(fileTX.TX,(err,res)=>{
                        if(err){
                            console.log(" Failed to broadcast " + fileTX.TXID + ", Code: " + err.message.code + " reason:" + err.message.message.slice(0,100))
                            //fs.writeFileSync(fileTX.hash,fileTX.toString())
                            this.unBroadcastedTXs.push({TXID:fileTX.TXID,TX:fileTX.TX,reason:err.message})
                            resolve()
                        }else{
                            console.log(" "+fileTX.TXID + " Broadcasted")
                            resolve()
                        }
                    })
                })
            })
        ).then(()=>{
        if(this.unBroadcastedTXs.length>0){
            console.log(" unBroadcasted TX: "+this.unBroadcastedTXs.length)
            fs.writeFileSync("TXs.unBroadcasted.json",JSON.stringify(this.unBroadcastedTXs))
        }else {
            console.log(" All TX Broadcasted")
            fs.unlinkSync("TXs.unBroadcasted.json");
        }
    })
}

Hammer.prototype.getFiles = function(path){
    // index all files
    
    if(!path){
        if(this.path)
        this.files = this.getFiles(this.path)
        return
    }
    // console.log("Handling Directory " + path)
    var files=[]
    var items=fs.readdirSync(path)
    items.forEach(item=>{
        var itemPath = path+"/"+item
        var stat = fs.statSync(itemPath)
        if(stat.isDirectory()){
            files = files.concat(this.getFiles(itemPath))
        }else{
            files.push(itemPath)
        }
    })
    return files
}

Hammer.prototype.prepareSitemap = function(){
    // Build a sitemap from files
    
    var path = this.path
    if(!path.endsWith('/'))path = path + '/'
    var map = {}
    map.urls= {}
    var sizecount = 0
    this.files.map(file=>{
        var stat = fs.statSync(file)
        if (stat.size>64000) sizecount += Math.floor(stat.size / 64000) * 64000
        sizecount += Math.max(stat.size % 64000, 546)
        var buffer = fs.readFileSync(file)
        var fsHash = crypto.createHash('md5')
        fsHash.update(buffer);
        var md5 = fsHash.digest('hex')
        var url = file.startsWith(path)?file.slice(path.length):file
        map.urls[url]={
            path: file,
            size: stat.size,
            chunks: Math.ceil(stat.size/64000),
            md5: md5,
            txid: null
        }
    })
    map.size = sizecount
    this.sitemap = map
    if(fs.existsSync('sitemap.proto.json')){
        var sitemap_old = JSON.parse(fs.readFileSync('sitemap.proto.json'))
        this.fillSitemap(sitemap_old)
    }
    return this.sitemap
}

Hammer.prototype.fillSitemap = function(sitemap_old){
    // read another sitemap, if a file is already uploaded, mark it as uploaded in sitemap.
    
    var urls=Object.keys(this.sitemap.urls)
    urls.forEach(url=>{
        if(sitemap_old.urls[url]){
            if(this.sitemap.urls[url].md5==sitemap_old.urls[url].md5){
                if(this.sitemap.urls[url].txid==null){
                    this.sitemap.urls[url].txid = sitemap_old.urls[url].txid
                }
            }
        }
    })
    return this.sitemap
}

Hammer.prototype.trimSitemap = function(){
    // get simplified sitemap
    
    var finalSitemap = {}
    finalSitemap.urls = {}
    var urls = Object.keys(this.sitemap.urls)
    urls.forEach(url=>{
        finalSitemap.urls[url]=this.sitemap.urls[url].txid
    })
    return finalSitemap
}

Hammer.prototype.buildMapTX = function(){
    var urls=Object.keys(this.sitemap.urls)
    var tx = bsv.Transaction()
    // Inputs
    this.utxos.forEach(utxo=>{
        tx.from(utxo)
    })
    // Outputs
    urls.forEach(url=>{
        var info = this.sitemap.urls[url]
        if(info.txid){
            console.log("Skiping "+url)
            return
        }
        info.utxos = []
        for(var chunk=0;chunk<info.chunks;chunk++){
            var fileKey = bsv.PrivateKey(this.privKey).childKey(info.md5 + chunk)
            tx.to(fileKey.toAddress(),2 * (Math.min(info.size-chunk*64000,64000)+400))
            var utxo = tx.outputs[tx.outputs.length-1].toJSON()
            utxo.vout = tx.outputs.length-1
            utxo.fileKey = fileKey.toString()
            info.utxos.push(utxo)
        }
    })
    // Change
    // insight API issue, wrong fee amount. Have to calculate manually.
    
    tx.feePerKb(2048)
    tx.change(this.privKey.toAddress())
    /*
    tx.to(this.privKey.toAddress(), tx.inputAmount - tx.outputAmount - 2 * tx.toString().length - 200)
    */
    if(tx.inputAmount-tx.outputAmount < tx.toString().length){
        console.log(" Insuffient Input Amount")
    }
    // Sign
    tx.sign(this.privKey)
    // Fill UTXO's txid
    urls.forEach(url=>{
        var info = this.sitemap.urls[url]
        if(info.txid){
            return
        }
        for(var chunk=0;chunk<info.chunks;chunk++){
            var utxo = info.utxos[chunk]
            utxo.txid = tx.hash
        }
    })
    this.maptx = tx
    return tx
}

Hammer.prototype.FileTX = function(fileInfo, chunk){
    var utxo = fileInfo.utxos[chunk]
    var tx = bsv.Transaction().from(utxo)
    var fileKey = bsv.PrivateKey(fileInfo.utxos[chunk].fileKey)
    var fileBuf = fs.readFileSync(fileInfo.path).slice(chunk*64000,(chunk+1)*64000)
    var script = bsv.Script.buildDataOut("19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut")
    script.add(fileBuf)
    script.add(Buffer.from(mime.lookup(fileInfo.path)))
    script.add(Buffer.from("binary"))
    script.add(Buffer.from(fileInfo.md5))
    var output = bsv.Transaction.Output({
        satoshis: 0,
        script: script.toHex()
    })
    tx.addOutput(output)
    tx.sign(fileKey)
    return tx
}

Hammer.prototype.saveSitemap = function(){
    fs.writeFileSync("sitemap.proto.json",JSON.stringify(this.sitemap,null,4))
    fs.writeFileSync("sitemap.json",JSON.stringify(this.trimSitemap(this.sitemap),null,4))
}

Hammer.prototype.saveFileTXstoJSON = function(){
    var TXs = {}
    if(fs.existsSync('fileTXs.json')){
        TXs=JSON.parse(fs.readFileSync('fileTXs.json').toString())
        fs.renameSync('fileTXs.json','fileTXs.old.json')
    }
    this.fileTXs.forEach(fileTX=>{
        console.log(" Saving " + fileTX.hash + " to fileTXs.json")
        TXs[fileTX.hash]=fileTX.toString()
    })
    fs.writeFileSync('fileTXs.json',JSON.stringify(TXs, null, 4))
}

Hammer.prototype.saveFileTXs = function(){
    var TXs = {}
    if(!fs.existsSync('Transactions')){
        fs.mkdirSync('Transactions')
    }
    this.fileTXs.forEach(fileTX=>{
        console.log(" Saving " + fileTX.hash + " to /Transactions")
        fs.writeFileSync('./Transactions/'+fileTX.hash, fileTX.toString())
    })
}

Hammer.prototype.getUtxos = function(){
    return new Promise((resolve, reject)=>{
        this.insight.getUnspentUtxos(this.privKey.toAddress(),(err,utxos)=>{
            if(err){
                reject("Insight API return Errors: " + err)
            }else{
                this.utxos = utxos
                resolve(this)
            }
        })
    })
}

Hammer.prototype.buildFileTXs = function(){
    this.fileTXs = []
    var urls=Object.keys(this.sitemap.urls)
    urls.forEach(url=>{
        var fileinfo = this.sitemap.urls[url]
        if(fileinfo.txid){
            // console.log("Skiping "+url)
            return
        }
        for(var chunk=0;chunk<fileinfo.chunks;chunk++){
            var tx = this.FileTX(fileinfo,chunk)
            this.fileTXs.push(tx)
            if(!fileinfo.txid)fileinfo.txid = []
            fileinfo.txid[chunk] = tx.hash
        }
    })
}

Hammer.prototype.reduceSitemap = function(){
    if(!(this.bitdb && this.bitdbKey))throw new Error("bitdb or bitdbKey not specified")
    var urls=Object.keys(this.sitemap.urls)
    return Promise.all(urls.map(murl=>{
        return new Promise((resolve,reject)=>{
            var fileinfo = this.sitemap.urls[murl]
            if(fileinfo.txid){
                resolve()
                return
            }
            var fileBuf = fs.readFileSync(fileinfo.path)
            var filechunks = []
            for(var chunk=0;chunk<fileinfo.chunks;chunk++){
                filechunks.push(fileBuf.slice(chunk*64000,(chunk+1)*64000))
            }
            
            var chunks = new Array(fileinfo.chunks)
            var query = {
                "v": 3,
                "q": {
                    "find": { "out.s5": fileinfo.md5},
                },
                "r": {
                    "f": "[ .[] | {content: .out[0].lb2, content_short: .out[0].b2, contenttype: .out[0].s3, txid: .tx.h} ]"
                }
            }
            var b64 = Buffer.from(JSON.stringify(query)).toString('base64')
            var url = this.bitdb + b64;
            var header = {
                headers: { key: this.bitdbKey }
            }
            resolve(fetch(url, header).then(function(r) {
              return r.json()
            }).then(function(r) {
                r.c.forEach(entry=>{
                    entry.content = Buffer.from(entry.content || entry.content_short, 'base64')
                    for(var chunk=0;chunk<filechunks.length; chunk++){
                        if(filechunks[chunk].equals(entry.content))chunks[chunk] = entry.txid
                    }
                })
                return
            }).then(()=>{
                for(var chunk=0;chunk<chunks.length; chunk++){
                    if(!chunks[chunk])return
                }
                console.log(" "+murl +" Found on chain")
                fileinfo.txid = chunks
                return
            }))
        })
    }))
}


function promiseTimeout (time) {
  return new Promise(function(resolve,reject){
    setTimeout(function(){resolve(time);},time);
  });
};

module.exports = Hammer