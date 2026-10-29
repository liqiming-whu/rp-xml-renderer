from pathlib import Path
import subprocess, shutil, hashlib
root=Path(__file__).resolve().parent
classes=root/'build-tools'/'classes-v230'
out=root/'build-tools'/'dex-v230'
classes.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
r8=root/'build-tools'/'r8-8.3.37.jar'
if not r8.exists():raise SystemExit('Missing Google R8 8.3.37 build-only dependency')
subprocess.run(['javac','--release','8','-encoding','UTF-8','-d',str(classes),str(root/'native'/'ScriptRunnerV230.java')],stdin=subprocess.DEVNULL,check=True,timeout=30)
subprocess.run(['java','-cp',str(r8),'com.android.tools.r8.D8','--release','--no-desugaring','--min-api','26','--output',str(out),*[str(f) for f in sorted(classes.rglob('*.class'))]],stdin=subprocess.DEVNULL,check=True,timeout=60)
target=root/'resources'/'rp-js-runner-v230.dex';shutil.copy2(out/'classes.dex',target)
print('NATIVE',target.stat().st_size,hashlib.sha256(target.read_bytes()).hexdigest())