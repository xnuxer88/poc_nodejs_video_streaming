var aws = require('aws-sdk')
const PORT = process.env.PORT || 3003;

//PIPELINE PREVENT MEMORY LEAK
// const videoPath = "videos/Sample.mp4";
const videoPath = "videos/SampleWKeyFrame.mp4";
const videoPathS3 = "SampleWKeyFrame.mp4";
// const videoPath = "videos/720Video.mp4";

// var megaByteMultipler = 25;
// var megaByteMultipler = 10;
var megaByteMultipler = 5;
// var megaByteMultipler = 2.5;
// var megaByteMultipler = 0.1;
const { createReadStream } = require('fs');
const { pipeline } = require('stream');
const { createServer } = require('http');
const server = createServer(
    (req, res) => {
        pipeline(createReadStream(videoPath), pipe(res), (err) =>{
            if(err) console.error(err);
        })
    }
)

var i = 0;
var express = require('express'),
    app = express(),
    fs = require("fs");

var bodyParser = require('body-parser');

var cors = require('cors');
var corsOptions = {
    origin: ["http://localhost:3000", "https://hls-js-dev.netlify.app"],
    optionsSuccessStatus: 200 // For legacy browser support
}

app.use(cors(corsOptions));

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
   extended: false
}));

app.use(bodyParser.json());

app.use('/video', express.static('videos'))
app.use('/video2', express.static('videos'))
app.use('/video3', express.static('videos'))
app.use('/videoDirectLink', express.static('videos'))
app.use('/videoDirectLinkTest', express.static('videos'))
app.use('/downloadDirectLinkS3', express.static('videos'))
app.use('/videoDirectLinkS3', express.static('videos'))

app.get("/api/getHello", (req, res) => {
    res.json({ message: "Hello from server!" });
});

app.post('/api/WriteJsonSchemaToFile', (req, res) => {
    var jsonSchema = req.body.jsonSchema;
    var path = `D:/Learn/FormIO/saved-schema/${req.body.fileName}.json`;
    const fs = require('fs');
    fs.writeFileSync(path, jsonSchema);
    res.json({message: "success"})
})

app.post('/',function(req,res){
    var username = req.body.username;
    var htmlData = 'Hello:' + username;
    res.send(htmlData);
    console.log(htmlData);
});

// VIDEO STREAMING
app.get("/", function (req, res) {
    res.sendFile("/index.html", { root: "D:/Learn/FormIO/react-node-app" });
});

// CHUNK
app.get('/video', (req, res) => {
    i++;
    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header");
    }
    else {
        console.log(`Range = ${range}`);
    }

    // get video stats
    const videoSize = fs.statSync(videoPath).size;

    // Parse Range
    // Example: "bytes=32324-"
    const CHUNK_SIZE = megaByteMultipler * (10 ** 6); // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // Create headers
    const contentLength = end - start + 1;
    console.log(`video hit (${i}). chunkSize=${CHUNK_SIZE/1000000} MB. start = ${start}. end = ${end}. contentLength = ${contentLength}, videoSize = ${videoSize}`);
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = fs.createReadStream(videoPath, { start, end });
    // console.log(videoStream);

    // Stream the video chunk to the client
    videoStream.pipe(res);
});

// CHUNK IF REQUEST HEADER CONTAIN RANGE
app.get('/video2', (req, res) => {
    i++;
    const videoStat = fs.statSync(videoPath);
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;
    console.log(videoRange);
    if (videoRange) {
        console.log(`With range header ${videoRange}`);
        const CHUNK_SIZE = megaByteMultipler * (10 ** 6); // 1MB
        const start = Number(videoRange.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, fileSize - 1);
        
        const contentLength = (end-start) + 1;
        console.log(`video2 hit (${i}). chunkSize=${CHUNK_SIZE}. start = ${start}. end = ${end}. contentLength = ${contentLength}, videoSize = ${fileSize}`);
        const file = fs.createReadStream(videoPath, {start, end});
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': contentLength,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        console.log("No range header");
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        console.log(`video2 hit (${i}). fileSize=${fileSize}`);
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.get('/videoDirectLink', function(req, res){
    i++;
    console.log(`videoDirectLink hit ${i}`);
    res.download(videoPath);
});

app.get('/videoDirectLinkTest', function(req, res){
    i++;
    console.log(`videoDirectLinkTest hit ${i}`);
    var fs = require("fs");
    var readstream = fs.createReadStream(videoPath);
    readstream.pipe(res);
});

app.get('/downloadDirectLinkS3', function(req, res){
    i++;
    console.log(`videoDirectLinkS3 hit ${i}`);

    aws.config.update(
        {
          accessKeyId: "<ACCESS KEY ID>",
          secretAccessKey: "<SECRET ACCESS KEY>",
          region: 'ap-southeast-1'
        }
    );
    console.log(`Config updated.`);
    var s3 = new aws.S3();
    var options = {
        Bucket    : 'actxa-awp-material-dev',
        Key    : videoPathS3,
    };
    console.log(`Parameters updated.`);

    return s3.getObject(params, (err, data) => {
        if (err) console.error(err);
        fs.writeFileSync(filePath, data.Body);

        //download
        res.download(filePath, function (err) {
        if (err) {
            // Handle error, but keep in mind the response may be partially-sent
            // so check res.headersSent
            console.log(res.headersSent)
        } else {
            // decrement a download credit, etc. // here remove temp file
            fs.unlink(filePath, function (err) {
                if (err) {
                    console.error(err);
                }
                console.log('Temp File Delete');
            });
        }
    })

    //res.attachment(videoPathS3);
    //res.download(s3.getObject(options));
    //var fileStream = s3.getObject(options).createReadStream();
    //fileStream.pipe(res);
});


app.get('/videoDirectLinkS3', function(req, res){
    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header!");
        return;
    }
    else {
        console.log(`Range = ${range}`);
    }

    i++;
    console.log(`videoDirectLinkS3 hit ${i}`);
    
    aws.config.update(
        {
          accessKeyId: "AKIA36CZ7MNDZN3S46GQ",
          secretAccessKey: "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",
          region: 'ap-southeast-1'
        }
    );
    
    console.log(`Config updated.`);
    var s3 = new aws.S3();
    var options = {
        Bucket    : 'actxa-awp-material-dev',
        Key    : videoPathS3,
    };

    s3.headObject(options, function (err, data) {
        if (err) {
            console.error(err);
            return res.status(500).send("An Error Occurred");
        }
        console.log(`Parameters updated.`);
        const videoSize = Number(data.ContentLength);
        const CHUNK_SIZE = megaByteMultipler * (10 ** 6); // 1MB
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

        var params = {
            Bucket: 'actxa-awp-material-dev',
            Key: videoPathS3,
            Range: range,
        };

        console.log(`Streaming[1]...`);
        var fileStream = s3.getObject(options).createReadStream();
        res.status(206);
        console.log(`Streaming[2]...`);
        res.set('Content-Type', data.ContentType);
        res.set('Content-Disposition','inline');
        res.set('Accept-Ranges','bytes');
        res.set('Accept-Encoding', 'Identity');
        res.set('Content-Range',  'bytes ' + start + '-' + end + '/' + videoSize);
        res.set('Content-Length', data.ContentLength);
        res.set('X-Playback-Session-Id', req.header('X-Playback-Session-Id')); // Part of the attempt to fix
        res.set('Connection', 'keep-alive');
        res.set('Last-Modified', data.LastModified);
        res.set('ETag', data.ETag);
        console.log(`Streaming[3]...`);
        res.attachment(videoPathS3);
        console.log(`Streaming[4]...`);
        fileStream.pipe(res);
    })
});

app.get('/videoHLS/:file', function(request, response){
    console.log(request.params.file);
    var filePath = `videos/${request.params.file}`;

    fs.readFile(filePath, function(error, content) {
        response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./404.html', function(error, content) {
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end(); 
            }
        }
        else {
            response.end(content, 'utf-8');
        }
    });

});

app.get('/videoHLSDirectLink', function(req, res){
    var filePath = "videos/Sample.m3u8"
    console.log('request starting...');
    res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});