import express from 'express';
import path  from 'path';
import { createServer } from "http";
import cluster from "cluster";
import { cpus } from "os";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

app.use(express.static(path.join("../node-client")));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,"/index.html"));
})

let rooms = [{roomName: "home", creator: null, user: [], count: 0 }];

const roomData = () => {
    let roomList = [];
    let creatorList = [];
    rooms.map((room) => {
        roomList = [...roomList, room.roomName]
        creatorList = [...creatorList, room.creator]
    })
    return {roomList, creatorList};
}

let messageList = {};
let userCount = 0;

io.on('connection', (socket) => {
    let currentRoom;
    let instanceId = socket.id;
    
    userCount++;
    io.sockets.emit('userCount', userCount);
    io.sockets.emit('roomList', {rooms});

    // 방 입장
    socket.on('joinRoom', (data) => {
        
        const {roomList, creatorList} = roomData()

        currentRoom = data.roomName;
        if (roomList.find(v => v == currentRoom) === undefined) {
            io.to(instanceId).emit('roomData', "fail");
            return false;
        }

        let currentRoomIndex = roomList.findIndex(v => v == currentRoom)

        rooms[currentRoomIndex].user = [...rooms[currentRoomIndex].user, instanceId];
        rooms[currentRoomIndex].count++;

        socket.join(currentRoom);
        io.sockets.to(currentRoom).emit('roomData', { message: messageList, currentRoom, rooms, instanceId, user: rooms[currentRoomIndex].user, count: rooms[currentRoomIndex].count});
    });

    // 방 퇴장
    socket.on('exitRoom', (data) => {
        const {roomList, creatorList} = roomData()

        let currentRoomIndex = roomList.findIndex(v => v == currentRoom)
        if( rooms[currentRoomIndex] == undefined) {
            return false;
        }
        rooms[currentRoomIndex].user = rooms[currentRoomIndex].user.filter((item) => item !== instanceId)
        rooms[currentRoomIndex].count--;
        
        io.sockets.to(currentRoom).emit('exitRoom', { user: rooms[currentRoomIndex].user, count: rooms[currentRoomIndex].count});
    });

    // 방 중복 클릭 방지
    socket.on("multipleJoinRoom", (data) => {
        io.sockets.to(instanceId).emit('multipleJoinRoom', {currentRoom});
    })

    // 채팅 받기 및 보내기
    socket.on('reciveMassage', (data) => {
        if (data.comment == '') {
            io.to(instanceId).emit('sendMassage', "fail");
            return false;
        }
        io.sockets.to(currentRoom).emit('sendMassage', {comment: instanceId + " : " + data.comment+'\n'});
    })

    // 채팅 데이터 넣기
    socket.on('massageList', (data) => {
        if(messageList[currentRoom]) {
            messageList[currentRoom] = [...messageList[currentRoom] , {message : instanceId + " : " + data.comment+'\n'}]
        } else {
            messageList[currentRoom] = [{message: instanceId + " : " + data.comment+'\n'}]
        }
    })
    
    // 방 생성
    socket.on("createRoom", (data) => {

        if(data.roomName == '') {
            io.to(instanceId).emit('roomList', "emtpyFail");
            return false;
        }
        const {roomList, creatorList} = roomData()

        if(roomList.find((v) => v == data.roomName) == data.roomName){
            io.to(instanceId).emit('roomList', "multypleFail");

        } else {
            rooms = [...rooms, {roomName : data.roomName, creator : instanceId, user : [], count : 0}];
            io.sockets.emit('roomList', {rooms, roomList});
        }
    })

    // 방 삭제
    socket.on("deleteRoom", (data) => {
        const {roomList, creatorList} = roomData()
        let roomIndex = roomList.findIndex((v) => v == data)
        
        if (roomIndex == -1 || rooms[roomIndex] == undefined) {
            io.to(instanceId).emit('deleteRoom', "fail");
            return false;
        }

        if (rooms[roomIndex].roomName !== data || rooms[roomIndex].creator !== instanceId){
            io.to(instanceId).emit('deleteRoom', "fail");
            return false;
        }

        rooms = rooms.filter((item) => {
            return item.roomName !== currentRoom
        });

        delete messageList[currentRoom];
        io.sockets.to(currentRoom).emit('deleteRoom');
        io.sockets.emit('roomList', {rooms, roomList});
        socket.leave(currentRoom);
  
    })

    // 채팅 연결 끊김
    socket.on('disconnect', () => {
        userCount--;
        io.sockets.emit('userCount', userCount);

        const {roomList, creatorList} = roomData()

        let currentRoomIndex = roomList.findIndex(v => v == currentRoom)
        if(rooms[currentRoomIndex] == undefined) {
            return false;
        }

        rooms[currentRoomIndex].user = rooms[currentRoomIndex].user.filter((item) => item !== instanceId)
        rooms[currentRoomIndex].count--;
        // console.log("연결끊김", currentRoomIndex, rooms[currentRoomIndex].user, rooms[currentRoomIndex].count )
        io.sockets.to(currentRoom).emit('exitRoom', { user: rooms[currentRoomIndex].user, count: rooms[currentRoomIndex].count});

	});
});

// if (cluster.isMaster){
//     console.log(`마스터 프로세스 아이디: ${process.pid}`);
//     for (let i = 0; i < cpus().length; i += 1) {
//         cluster.fork();
//     }
//     cluster.on('exit', (worker, code, signal) => {
//         logger.error(`${worker.process.pid}번 워커가 종료되었습니다.`);
//         console.log('code', code, 'signal', signal);
//         cluster.fork();
//     });

// } else {
//     // httpServer.listen(config.server_port, () => {
//     httpServer.listen(3000, () => {
//     console.log(`${process.pid}번 워커 실행`);
//     })
// }

httpServer.listen(3000, () => {
    console.log("localhost:3000")
});