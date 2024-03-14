import base64
import requests
import sys

file_dir = sys.argv[1]
name_file = file_dir.split('/')[-1]

file_encd = None
with open(file_dir, "rb") as image_file:
    file_encd = base64.b64encode(image_file.read()).decode('utf-8')

rd_json = {'name': name_file, 'type': 'image', 'isPublic': True,
          'data': file_encd, 'parentId': sys.argv[3]}
rd_head = {'X-Token': sys.argv[2]}

req = requests.post("http://0.0.0.0:5000/files", json=rd_json, headers=rd_head)
print(req.json())
