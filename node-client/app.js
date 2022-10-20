const socket = io.connect('http://localhost:3000');

// 초기 방(Home) 설정
socket.emit('joinRoom', { roomName: 'home' });

// 초기 방(Home) 입장 시 기존 채팅 내용 보여줌
socket.once('roomData', (data) => {
    if( data.message[data.currentRoom] ) {
        data.message[data.currentRoom].map((v, i) => {
            $('#chat').append(data.message[data.currentRoom][i].message);
        });
    }
});

// 방 리스트 보여줌
socket.on('roomList', (data) => {

    if (data === "emtpyFail" || data === "multypleFail"){
        return false;
    }

    let roomList = '';
    data.rooms.forEach((v, i) => {
        roomList += `<li id="${data.rooms[i].roomName}" class="room">
            <p onclick="joinRoom('${data.rooms[i].roomName}')"> ${data.rooms[i].roomName}</p>
            <p class="delete-button" onclick="deleteRoom('${data.rooms[i].roomName}')">삭제</p>
        </li>`;
    });
    document.querySelector("#roomList").innerHTML = roomList;
});

// 유저 입장 알림
socket.on('roomData', (data) => {

    const userList = document.querySelector('#userList')
    let users = ""
    data.user.forEach((v, i) => {
        users += `${data.user[i]}\n`
    })
    userList.innerHTML = users;
    document.querySelector('#roomCount').innerHTML = data.count;
});

// 전체 유저 수 카운트
socket.on('userCount', (data) => {
    document.querySelector('#count').innerHTML = data;
});

// 채팅 받기
socket.on('sendMassage', (data) => {
    if(data === "fail") {
        alert("채팅 내용을 입력해주세요.")
        return false;
    }
    $('#chat').append(data.comment);
});

// 채팅 보내기
const sendMassage = () => {
    const contents = document.querySelector("#user");
    
    if( contents.value == '') {
        alert("채팅 내용을 입력해주세요.")
        return false;
    }
    socket.emit("reciveMassage", { comment: contents.value });
    socket.emit("massageList", { comment: contents.value });
    contents.value = '';
}

// 엔터(Enter)로 채팅 보내기 
const handleSendMessageEvent = () => {
    if (window.event.keyCode == 13) {
        sendMassage()
    }
}

// 방 입장
const joinRoom = (roomName) => {
    socket.emit('multipleJoinRoom', { roomName });
    socket.once('multipleJoinRoom', (data) => {

        socket.emit('exitRoom', { roomName });
        socket.emit('joinRoom', { roomName });
        document.querySelector('#chat').innerHTML = ""
        socket.once('roomData', (data) => {
            if (data == "fail") {
                alert("잘못된 접근방법입니다.");
                return false;
            }
    
            if( data.message[data.currentRoom] ) {
                data.message[data.currentRoom].map((v, i) => {
                    $('#chat').append(data.message[data.currentRoom][i].message);
                });
            }
    
            let filterData = data.rooms.filter((item) => {
                return item.roomName == roomName;
            });
            
            const deleteButton = document.querySelectorAll('.delete-button')
    
            deleteButton.forEach((v, i)=>{
                deleteButton[i].style.display = "none";
            })
            if (data.currentRoom !== "home") {
                document.querySelector('#chat').append(data.instanceId + "님이 접속하셨습니다.\n");
            }

            if(filterData[0].creator === data.instanceId) {
                document.querySelector(`#${filterData[0].roomName} .delete-button`).style.display = "block";
            }
        });
    })
}

// 방 퇴장
socket.on('exitRoom', (data) => {
    // console.log(data)
});

// 방 생성
const createRoom = async () => {
    let roomName = document.querySelector("#room").value
    if(roomName == '') {
        alert("방 제목을 입력해주세요.")
        return false;
    }

    socket.emit("createRoom", {roomName})
    socket.once('roomList', (data) => {
        
        if (data === "emtpyFail"){
            alert("방 제목을 입력해주세요.")
            return false;
        }
        if (data === "multypleFail"){
            alert("중복된 방 이름이 있습니다. 다른 이름으로 설정해주세요.")
            return false;
        }

        joinRoom(roomName);
        $('#room').val('');
    
        document.querySelector('#chat').innerHTML = `${roomName} 방을 생성했습니다.\n`;
    })
}

// 엔터(Enter)로 방 생성
const handleCretaeRoomEvent = () => {
    if (window.event.keyCode == 13) {
        createRoom()
    }
}

// 방 삭제
const deleteRoom = (data) => {
    socket.emit("deleteRoom", data)
}

// 방 삭제 후 이벤트
socket.on('deleteRoom', (data) => {
    if (data === "fail"){
        alert("잘못된 접근방법입니다.")
        return false;
    }
    alert("방이 삭제되었습니다.")
    joinRoom("home")
});