import json
from flask import Flask, request, jsonify, render_template, Response
import requests
import base64

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/describe', methods=['POST'])
def describe():
    encoded_string = request.json['image']
    prompt = request.json['prompt']
    option = request.json['option']
    image_data = [{"data": encoded_string, "id": 12}]
    # Describe the image briefly and accurately. If the picture contains a TV, answer yes or no
    data = {
        "prompt": "USER:[img-12]{}\nASSISTANT:".format(prompt), 
        "n_predict": 256, 
        "image_data": image_data, 
        "stream": True
    }
    # data = {
    #     "prompt": "USER:[img-12]详细描述一下图片的内容，用中文回答。\nASSISTANT:", 
    #     "n_predict": 256, 
    #     "image_data": image_data, 
    #     "stream": True
    # }
    headers = {"Content-Type": "application/json"}
    url = "http://localhost:8080/completion"
    
    response = requests.post(url, headers=headers, json=data, stream=True)
    
    def generate():
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:  # filter out keep-alive new chunks
                try:
                    chunk_json = json.loads(chunk.decode().split("data: ")[1])
                    content = chunk_json.get("content", "")
                    if content:
                        yield content
                except json.JSONDecodeError:
                    continue  # In case of decoding error, continue to next chunk

    return Response(generate(), content_type='text/plain')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')