from pathlib import Path
import subprocess, zipfile, json, hashlib
root=Path(__file__).resolve().parent
subprocess.run(['python3',str(root/'build_native.py')],stdin=subprocess.DEVNULL,check=True,timeout=90)
subprocess.run(['tsc','-p',str(root/'tsconfig.json'),'--pretty','false'],stdin=subprocess.DEVNULL,check=True,timeout=30)
subprocess.run(['node',str(root/'export-examples.cjs')],stdin=subprocess.DEVNULL,check=True,timeout=15)
outputs=[]
for suite in ['test.cjs','test-v21.cjs','test-v23.cjs','test-v231.cjs','test-examples.cjs','test-v232.cjs']:
 result=subprocess.run(['node',str(root/suite)],stdin=subprocess.DEVNULL,capture_output=True,text=True,timeout=15)
 outputs.append(result.stdout)
 if result.returncode:
  print(result.stdout+result.stderr)
  raise SystemExit(result.returncode)
(root/'test-results.txt').write_text(''.join(outputs))
manifest=json.loads((root/'manifest.json').read_text())
out=root/('com.operit.rp_xml_renderer-v'+manifest['version']+'.toolpkg')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name in ['manifest.json']+[str(x.relative_to(root)) for x in sorted((root/'dist').glob('*.js'))]+[item['path'] for item in manifest.get('resources',[])]:
  z.write(root/name,name)
for output in outputs:
 print(output.strip().splitlines()[-1])
print(json.dumps({'archive':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'bytes':out.stat().st_size}))
