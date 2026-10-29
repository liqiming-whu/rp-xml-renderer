package com.operit.rpxml.sandbox;

import java.lang.reflect.*;
import java.security.SecureRandom;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Pure QuickJS realm; the only host capability is bounded SecureRandom sampling. */
public final class ScriptRunnerV230 {
    private static final String RUNTIME = "com.ai.assistance.operit.core.tools.javascript.QuickJsNativeRuntime";
    private static final Semaphore SLOTS = new Semaphore(2);
    private static final AtomicInteger ACTIVE = new AtomicInteger();
    public static int activeCount() { return ACTIVE.get(); }
    private static String quote(String value) {
        if (value == null) return "\"\"";
        StringBuilder s = new StringBuilder("\"");
        for (int i=0;i<value.length();i++) {
            char c=value.charAt(i);
            if(c=='"'||c=='\\') s.append('\\').append(c);
            else if(c=='\n')s.append("\\n");else if(c=='\r')s.append("\\r");else if(c=='\t')s.append("\\t");
            else if(c<32)s.append(String.format("\\u%04x",(int)c));else s.append(c);
        }
        return s.append('"').toString();
    }
    private static String failure(String code, String message) {
        return "{\"ok\":false,\"code\":"+quote(code)+",\"message\":"+quote(message)+"}";
    }
    private static Throwable root(Throwable e) {
        while (e instanceof InvocationTargetException && ((InvocationTargetException)e).getCause()!=null) e=((InvocationTargetException)e).getCause();
        return e;
    }
    private static Object get(Object object,String method) throws Exception { return object.getClass().getMethod(method).invoke(object); }
    private static String evalError(Object result) throws Exception {
        String msg=String.valueOf(get(result,"getErrorMessage"));
        String stack=String.valueOf(get(result,"getErrorStack"));
        return failure("JS_RUNTIME",msg+("null".equals(stack)?"":"\n"+stack));
    }
    private static String decodeString(String json) throws Exception {
        Object parser=Class.forName("org.json.JSONTokener").getConstructor(String.class).newInstance(json);
        Object value=parser.getClass().getMethod("nextValue").invoke(parser);
        if(!(value instanceof String))throw new IllegalStateException("Unexpected sandbox result type");
        return (String)value;
    }
    public static String run(String bootstrap,int timeoutMs) {
        if(bootstrap==null||bootstrap.length()>160000)return failure("INVALID_PARAMS","脚本包装长度超限");
        if(timeoutMs<100||timeoutMs>3000)return failure("INVALID_PARAMS","执行时限范围为 100～3000 ms");
        if(!SLOTS.tryAcquire())return failure("BUSY","已有两个脚本在执行，请稍后重试");
        Object runtime=null;
        ScheduledExecutorService timer=null;
        ScheduledFuture<?> alarm=null;
        final AtomicBoolean expired=new AtomicBoolean(false);
        ACTIVE.incrementAndGet();
        try {
            final SecureRandom random=new SecureRandom();
            final Class<?> type=Class.forName(RUNTIME);
            final Class<?> bridgeType=Class.forName(RUNTIME+"$HostBridge");
            Object bridge=Proxy.newProxyInstance(bridgeType.getClassLoader(),new Class<?>[]{bridgeType},new InvocationHandler(){
                public Object invoke(Object proxy,Method method,Object[] args) {
                    if(method.getName().equals("onCall")) {
                        if(!"randomInt".equals(String.valueOf(args[0])))throw new UnsupportedOperationException("Host access denied");
                        int bound=Integer.parseInt(String.valueOf(args[1]));
                        if(bound<1||bound>1000000)throw new IllegalArgumentException("Random bound out of range");
                        return Integer.toString(random.nextInt(bound));
                    }
                    if(method.getName().equals("toString"))return "RestrictedRandomBridge";
                    if(method.getName().equals("hashCode"))return System.identityHashCode(proxy);
                    if(method.getName().equals("equals"))return proxy==args[0];
                    throw new UnsupportedOperationException("Host access denied");
                }
            });
            Object companion=type.getField("Companion").get(null);
            runtime=companion.getClass().getMethod("create",bridgeType).invoke(companion,bridge);
            final Object target=runtime;
            final Method interrupt=type.getMethod("interrupt");
            final long deadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(timeoutMs);
            timer=Executors.newSingleThreadScheduledExecutor(new ThreadFactory(){public Thread newThread(Runnable r){Thread t=new Thread(r,"RpJsDeadline");t.setDaemon(true);return t;}});
            // Repeated interrupts close the race with QuickJS resetting its flag at eval entry.
            alarm=timer.scheduleAtFixedRate(new Runnable(){public void run(){expired.set(true);try{interrupt.invoke(target);}catch(Throwable ignored){}}},timeoutMs,10,TimeUnit.MILLISECONDS);
            Object first=type.getMethod("eval",String.class,String.class).invoke(runtime,bootstrap,"rp-user-script.js");
            if(expired.get()||System.nanoTime()>=deadline)return failure("JS_TIMEOUT","JS 执行超过 "+timeoutMs+" ms，已中断");
            if(!Boolean.TRUE.equals(get(first,"getSuccess")))return evalError(first);
            Method jobs=type.getMethod("executePendingJobs",int.class);
            Method call=type.getMethod("callFunction",String.class,String.class,String.class);
            while(true) {
                if(expired.get()||System.nanoTime()>=deadline)return failure("JS_TIMEOUT","JS 执行超过 "+timeoutMs+" ms，已中断");
                jobs.invoke(runtime,64);
                if(expired.get()||System.nanoTime()>=deadline)return failure("JS_TIMEOUT","JS 执行超过 "+timeoutMs+" ms，已中断");
                Object result=call.invoke(runtime,"__rpReadResultV230","[]","rp-result.js");
                if(expired.get()||System.nanoTime()>=deadline)return failure("JS_TIMEOUT","JS 执行超过 "+timeoutMs+" ms，已中断");
                if(!Boolean.TRUE.equals(get(result,"getSuccess")))return evalError(result);
                String decoded=decodeString(String.valueOf(get(result,"getValueJson")));
                if(!decoded.isEmpty()) {
                    if(decoded.length()>131072)return failure("OUTPUT_LIMIT","沙盒返回结果过长");
                    return decoded;
                }
                Thread.sleep(1);
            }
        } catch(Throwable e) {
            Throwable cause=root(e);
            if(expired.get())return failure("JS_TIMEOUT","JS 执行超过 "+timeoutMs+" ms，已中断");
            String code=(cause instanceof ClassNotFoundException||cause instanceof NoSuchMethodException||cause instanceof NoSuchFieldException)?"ENV_UNSUPPORTED":"EXECUTION_FAILED";
            return failure(code,cause.toString());
        } finally {
            if(alarm!=null)alarm.cancel(false);
            if(timer!=null)timer.shutdownNow();
            if(runtime!=null)try{runtime.getClass().getMethod("close").invoke(runtime);}catch(Throwable ignored){}
            ACTIVE.decrementAndGet();SLOTS.release();
        }
    }
}
