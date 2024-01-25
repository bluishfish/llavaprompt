let video = document.getElementById('videoElement');
let promptDialog = document.getElementById('promptDialog');
let promptText = document.getElementById('promptText');
let facingMode = "user";
let stream = null;
let prompt = "";
let option = "describe"
let dataURL = null;
let timer = null;

promptDialog.addEventListener("close",function(e){
  console.info("close");
  let rV = promptDialog.returnValue;
  console.info( rV );
  if(rV =="submit"){
    option = document.querySelector('input[name="option"]:checked').value;
    prompt = document.getElementById('prompt').value;

    if(document.getElementById('showPrompt').checked){
      promptText.style.visibility = 'visible'
    }else{
      promptText.style.visibility = 'hidden'
    }

    if(option == "describe"){
      if(prompt == ""){
        prompt = "Describe the image briefly and accurately."
      }
      
    }else if (option == "action"){
      if(prompt == ""){
        prompt = "If the picture contains a person"
      }
      prompt += ", answer yes or no"
    }
    document.getElementById('promptText').textContent = option +": "+ prompt


    if(document.getElementById('autoRun').checked){
      timer && clearInterval(timer) 
      timer=setInterval(function() {
        describe();
      },15000); 
    }else{
      timer && clearInterval(timer) 
    }

    describe();

  }else if(rV =="cancel"){
    console.info("cancel");
  }
  promptDialog.returnValue = ""; // 清空该值，否则会一直保留到对话框上。
});

function startVideo() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } })
    .then(function (mediaStream) {
      stream = mediaStream;
      video.srcObject = mediaStream;
      video.onloadedmetadata = function (e) {
        video.play();
        if (facingMode === 'user') {
          video.style.transform = 'scaleX(-1)';
        } else {
          video.style.transform = 'scaleX(1)';
        }
      };
    })
    .catch(function (err) { console.log(err.name + ": " + err.message); });
}

document.getElementById('btnPrompt').addEventListener('click', function () {
  document.getElementById('description').textContent = '';
  document.getElementById('actionImg').src = "";
  promptDialog.showModal();
});

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    // if (document.exitFullscreen) {
    //   document.exitFullscreen();
    // }
  }
}

document.getElementById('switchCamera').addEventListener('click', function () {
  toggleFullScreen();
  facingMode = facingMode === "user" ? "environment" : "user";
  startVideo();
});

function narrateDescription(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

document.getElementById('narrate').addEventListener('click', function () {
  narrateDescription(document.getElementById('description').textContent);
});

function describe () {
  let canvas = document.createElement('canvas');
  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;
  let ctx = canvas.getContext('2d');

  function downloadCanvasImage() {
    const dataURL = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = 'canvasImage.png';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  function drawVideoToCanvas() {
    const videoRatio = video.videoWidth / video.videoHeight;
    const canvasRatio = canvas.width / canvas.height;
    let drawWidth, drawHeight, startX, startY;

    if (videoRatio > canvasRatio) {
      drawHeight = video.videoHeight;
      drawWidth = video.videoHeight * canvasRatio;
      startX = (video.videoWidth - drawWidth) / 2;
      startY = 0;
    } else {
      drawWidth = video.videoWidth;
      drawHeight = video.videoWidth / canvasRatio;
      startX = 0;
      startY = (video.videoHeight - drawHeight) / 2;
    }

    ctx.drawImage(video, startX, startY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
  }

  drawVideoToCanvas();

  dataURL = canvas.toDataURL('image/png');
  let base64ImageContent = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
  const descriptionDiv = document.getElementById('description');

  descriptionDiv.textContent = 'Loading...';

  fetch('/describe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      image: base64ImageContent,
      prompt: prompt,
      option: option
     })
  })
    .then(response => {
      descriptionDiv.textContent = '';

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      reader.read().then(function processText({ done, value }) {
        if (done) {
          if (buffer.length) {
            descriptionDiv.textContent += buffer + ' ';
          }
          
          if (option == "action"){
            if(descriptionDiv.textContent.replace(/\s+/g,"").toLowerCase()=="yes"){
              console.log("yes")
              document.getElementById('actionImg').src = dataURL
            }else{
              console.log("no")
              document.getElementById('actionImg').src = ""
            }
          }
          
          return;
        }
        const text = buffer + decoder.decode(value, { stream: true });
        const words = text.split('');
        buffer = words.pop();
        words.forEach(word => descriptionDiv.textContent += word + '');
        reader.read().then(processText);
      });
    })
    .catch(err => console.error(err));
}


document.getElementById('describe').addEventListener('click', describe);


startVideo();