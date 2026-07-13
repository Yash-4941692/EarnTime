(()=>{var Hi=Object.defineProperty;var hd=Object.getOwnPropertyDescriptor;var gd=Object.getOwnPropertyNames;var vd=Object.prototype.hasOwnProperty;var yd=(S,j)=>()=>(S&&(j=S(S=0)),j);var wd=(S,j)=>{for(var p in j)Hi(S,p,{get:j[p],enumerable:!0})},xd=(S,j,p,b)=>{if(j&&typeof j=="object"||typeof j=="function")for(let q of gd(j))!vd.call(S,q)&&q!==p&&Hi(S,q,{get:()=>j[q],enumerable:!(b=hd(j,q))||b.enumerable});return S};var Sd=S=>xd(Hi({},"__esModule",{value:!0}),S);var ga={};wd(ga,{Component:()=>Ld,Fragment:()=>zd,StrictMode:()=>Pd,createContext:()=>_d,createElement:()=>Td,default:()=>g,useCallback:()=>kd,useContext:()=>Nd,useEffect:()=>Ai,useMemo:()=>Ed,useRef:()=>Cd,useState:()=>Mt});var ha,g,Mt,Ai,kd,Ed,Cd,Nd,_d,zd,Pd,Td,Ld,ql=yd(()=>{(function(){"use strict";(function(S,j){typeof exports=="object"&&typeof module<"u"?j(exports):typeof define=="function"&&define.amd?define(["exports"],j):(S=S||self,j(S.React={}))})(this,function(S){function j(s){return s===null||typeof s!="object"?null:(s=rr&&s[rr]||s["@@iterator"],typeof s=="function"?s:null)}function p(s,h,k){this.props=s,this.context=h,this.refs=Nn,this.updater=k||lr}function b(){}function q(s,h,k){this.props=s,this.context=h,this.refs=Nn,this.updater=k||lr}function Dt(s,h,k){var T,D={},H=null,W=null;if(h!=null)for(T in h.ref!==void 0&&(W=h.ref),h.key!==void 0&&(H=""+h.key),h)ir.call(h,T)&&!ur.hasOwnProperty(T)&&(D[T]=h[T]);var V=arguments.length-2;if(V===1)D.children=k;else if(1<V){for(var U=Array(V),oe=0;oe<V;oe++)U[oe]=arguments[oe+2];D.children=U}if(s&&s.defaultProps)for(T in V=s.defaultProps,V)D[T]===void 0&&(D[T]=V[T]);return{$$typeof:nt,type:s,key:H,ref:W,props:D,_owner:_n.current}}function Ft(s,h){return{$$typeof:nt,type:s.type,key:h,ref:s.ref,props:s.props,_owner:s._owner}}function It(s){return typeof s=="object"&&s!==null&&s.$$typeof===nt}function G(s){var h={"=":"=0",":":"=2"};return"$"+s.replace(/[=:]/g,function(k){return h[k]})}function qe(s,h){return typeof s=="object"&&s!==null&&s.key!=null?G(""+s.key):h.toString(36)}function ke(s,h,k,T,D){var H=typeof s;(H==="undefined"||H==="boolean")&&(s=null);var W=!1;if(s===null)W=!0;else switch(H){case"string":case"number":W=!0;break;case"object":switch(s.$$typeof){case nt:case Rt:W=!0}}if(W)return W=s,D=D(W),s=T===""?"."+qe(W,0):T,or(D)?(k="",s!=null&&(k=s.replace($t,"$&/")+"/"),ke(D,h,k,"",function(oe){return oe})):D!=null&&(It(D)&&(D=Ft(D,k+(!D.key||W&&W.key===D.key?"":(""+D.key).replace($t,"$&/")+"/")+s)),h.push(D)),1;if(W=0,T=T===""?".":T+":",or(s))for(var V=0;V<s.length;V++){H=s[V];var U=T+qe(H,V);W+=ke(H,h,k,U,D)}else if(U=j(s),typeof U=="function")for(s=U.call(s),V=0;!(H=s.next()).done;)H=H.value,U=T+qe(H,V++),W+=ke(H,h,k,U,D);else if(H==="object")throw h=String(s),Error("Objects are not valid as a React child (found: "+(h==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":h)+"). If you meant to render a collection of children, use an array instead.");return W}function Ie(s,h,k){if(s==null)return s;var T=[],D=0;return ke(s,T,"","",function(H){return h.call(k,H,D++)}),T}function on(s){if(s._status===-1){var h=s._result;h=h(),h.then(function(k){(s._status===0||s._status===-1)&&(s._status=1,s._result=k)},function(k){(s._status===0||s._status===-1)&&(s._status=2,s._result=k)}),s._status===-1&&(s._status=0,s._result=h)}if(s._status===1)return s._result.default;throw s._result}function ft(s,h){var k=s.length;s.push(h);e:for(;0<k;){var T=k-1>>>1,D=s[T];if(0<ye(D,h))s[T]=h,s[k]=D,k=T;else break e}}function te(s){return s.length===0?null:s[0]}function Ee(s){if(s.length===0)return null;var h=s[0],k=s.pop();if(k!==h){s[0]=k;e:for(var T=0,D=s.length,H=D>>>1;T<H;){var W=2*(T+1)-1,V=s[W],U=W+1,oe=s[U];if(0>ye(V,k))U<D&&0>ye(oe,V)?(s[T]=oe,s[U]=k,T=U):(s[T]=V,s[W]=k,T=W);else if(U<D&&0>ye(oe,k))s[T]=oe,s[U]=k,T=U;else break e}}return h}function ye(s,h){var k=s.sortIndex-h.sortIndex;return k!==0?k:s.id-h.id}function jt(s){for(var h=te(Be);h!==null;){if(h.callback===null)Ee(Be);else if(h.startTime<=s)Ee(Be),h.sortIndex=h.expirationTime,ft(je,h);else break;h=te(Be)}}function Ut(s){if(cn=!1,jt(s),!vt)if(te(je)!==null)vt=!0,tt(et);else{var h=te(Be);h!==null&&pt(Ut,h.startTime-s)}}function et(s,h){vt=!1,cn&&(cn=!1,ar(yt),yt=-1),gt=!0;var k=J;try{for(jt(h),Pe=te(je);Pe!==null&&(!(Pe.expirationTime>h)||s&&!Ot());){var T=Pe.callback;if(typeof T=="function"){Pe.callback=null,J=Pe.priorityLevel;var D=T(Pe.expirationTime<=h);h=lt(),typeof D=="function"?Pe.callback=D:Pe===te(je)&&Ee(je),jt(h)}else Ee(je);Pe=te(je)}if(Pe!==null)var H=!0;else{var W=te(Be);W!==null&&pt(Ut,W.startTime-h),H=!1}return H}finally{Pe=null,J=k,gt=!1}}function Ot(){return!(lt()-dr<cr)}function tt(s){Ln=s,ot||(ot=!0,Mn())}function pt(s,h){yt=Pn(function(){s(lt())},h)}function un(s){throw Error("act(...) is not supported in production builds of React.")}var nt=Symbol.for("react.element"),Rt=Symbol.for("react.portal"),sn=Symbol.for("react.fragment"),P=Symbol.for("react.strict_mode"),le=Symbol.for("react.profiler"),ne=Symbol.for("react.provider"),mt=Symbol.for("react.context"),an=Symbol.for("react.forward_ref"),rt=Symbol.for("react.suspense"),En=Symbol.for("react.memo"),nr=Symbol.for("react.lazy"),rr=Symbol.iterator,lr={isMounted:function(s){return!1},enqueueForceUpdate:function(s,h,k){},enqueueReplaceState:function(s,h,k,T){},enqueueSetState:function(s,h,k,T){}},Cn=Object.assign,Nn={};p.prototype.isReactComponent={},p.prototype.setState=function(s,h){if(typeof s!="object"&&typeof s!="function"&&s!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,s,h,"setState")},p.prototype.forceUpdate=function(s){this.updater.enqueueForceUpdate(this,s,"forceUpdate")},b.prototype=p.prototype;var Re=q.prototype=new b;Re.constructor=q,Cn(Re,p.prototype),Re.isPureReactComponent=!0;var or=Array.isArray,ir=Object.prototype.hasOwnProperty,_n={current:null},ur={key:!0,ref:!0,__self:!0,__source:!0},$t=/\/+/g,pe={current:null},zn={transition:null};if(typeof performance=="object"&&typeof performance.now=="function")var ht=performance,lt=function(){return ht.now()};else{var sr=Date,eo=sr.now();lt=function(){return sr.now()-eo}}var je=[],Be=[],to=1,Pe=null,J=3,gt=!1,vt=!1,cn=!1,Pn=typeof setTimeout=="function"?setTimeout:null,ar=typeof clearTimeout=="function"?clearTimeout:null,Tn=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);var ot=!1,Ln=null,yt=-1,cr=5,dr=-1,wt=function(){if(Ln!==null){var s=lt();dr=s;var h=!0;try{h=Ln(!0,s)}finally{h?Mn():(ot=!1,Ln=null)}}else ot=!1};if(typeof Tn=="function")var Mn=function(){Tn(wt)};else if(typeof MessageChannel<"u"){Re=new MessageChannel;var Kr=Re.port2;Re.port1.onmessage=wt,Mn=function(){Kr.postMessage(null)}}else Mn=function(){Pn(wt,0)};Re={ReactCurrentDispatcher:pe,ReactCurrentOwner:_n,ReactCurrentBatchConfig:zn,Scheduler:{__proto__:null,unstable_ImmediatePriority:1,unstable_UserBlockingPriority:2,unstable_NormalPriority:3,unstable_IdlePriority:5,unstable_LowPriority:4,unstable_runWithPriority:function(s,h){switch(s){case 1:case 2:case 3:case 4:case 5:break;default:s=3}var k=J;J=s;try{return h()}finally{J=k}},unstable_next:function(s){switch(J){case 1:case 2:case 3:var h=3;break;default:h=J}var k=J;J=h;try{return s()}finally{J=k}},unstable_scheduleCallback:function(s,h,k){var T=lt();switch(typeof k=="object"&&k!==null?(k=k.delay,k=typeof k=="number"&&0<k?T+k:T):k=T,s){case 1:var D=-1;break;case 2:D=250;break;case 5:D=1073741823;break;case 4:D=1e4;break;default:D=5e3}return D=k+D,s={id:to++,callback:h,priorityLevel:s,startTime:k,expirationTime:D,sortIndex:-1},k>T?(s.sortIndex=k,ft(Be,s),te(je)===null&&s===te(Be)&&(cn?(ar(yt),yt=-1):cn=!0,pt(Ut,k-T))):(s.sortIndex=D,ft(je,s),vt||gt||(vt=!0,tt(et))),s},unstable_cancelCallback:function(s){s.callback=null},unstable_wrapCallback:function(s){var h=J;return function(){var k=J;J=h;try{return s.apply(this,arguments)}finally{J=k}}},unstable_getCurrentPriorityLevel:function(){return J},unstable_shouldYield:Ot,unstable_requestPaint:function(){},unstable_continueExecution:function(){vt||gt||(vt=!0,tt(et))},unstable_pauseExecution:function(){},unstable_getFirstCallbackNode:function(){return te(je)},get unstable_now(){return lt},unstable_forceFrameRate:function(s){0>s||125<s?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):cr=0<s?Math.floor(1e3/s):5},unstable_Profiling:null}},S.Children={map:Ie,forEach:function(s,h,k){Ie(s,function(){h.apply(this,arguments)},k)},count:function(s){var h=0;return Ie(s,function(){h++}),h},toArray:function(s){return Ie(s,function(h){return h})||[]},only:function(s){if(!It(s))throw Error("React.Children.only expected to receive a single React element child.");return s}},S.Component=p,S.Fragment=sn,S.Profiler=le,S.PureComponent=q,S.StrictMode=P,S.Suspense=rt,S.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Re,S.act=un,S.cloneElement=function(s,h,k){if(s==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+s+".");var T=Cn({},s.props),D=s.key,H=s.ref,W=s._owner;if(h!=null){if(h.ref!==void 0&&(H=h.ref,W=_n.current),h.key!==void 0&&(D=""+h.key),s.type&&s.type.defaultProps)var V=s.type.defaultProps;for(U in h)ir.call(h,U)&&!ur.hasOwnProperty(U)&&(T[U]=h[U]===void 0&&V!==void 0?V[U]:h[U])}var U=arguments.length-2;if(U===1)T.children=k;else if(1<U){V=Array(U);for(var oe=0;oe<U;oe++)V[oe]=arguments[oe+2];T.children=V}return{$$typeof:nt,type:s.type,key:D,ref:H,props:T,_owner:W}},S.createContext=function(s){return s={$$typeof:mt,_currentValue:s,_currentValue2:s,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},s.Provider={$$typeof:ne,_context:s},s.Consumer=s},S.createElement=Dt,S.createFactory=function(s){var h=Dt.bind(null,s);return h.type=s,h},S.createRef=function(){return{current:null}},S.forwardRef=function(s){return{$$typeof:an,render:s}},S.isValidElement=It,S.lazy=function(s){return{$$typeof:nr,_payload:{_status:-1,_result:s},_init:on}},S.memo=function(s,h){return{$$typeof:En,type:s,compare:h===void 0?null:h}},S.startTransition=function(s,h){h=zn.transition,zn.transition={};try{s()}finally{zn.transition=h}},S.unstable_act=un,S.useCallback=function(s,h){return pe.current.useCallback(s,h)},S.useContext=function(s){return pe.current.useContext(s)},S.useDebugValue=function(s,h){},S.useDeferredValue=function(s){return pe.current.useDeferredValue(s)},S.useEffect=function(s,h){return pe.current.useEffect(s,h)},S.useId=function(){return pe.current.useId()},S.useImperativeHandle=function(s,h,k){return pe.current.useImperativeHandle(s,h,k)},S.useInsertionEffect=function(s,h){return pe.current.useInsertionEffect(s,h)},S.useLayoutEffect=function(s,h){return pe.current.useLayoutEffect(s,h)},S.useMemo=function(s,h){return pe.current.useMemo(s,h)},S.useReducer=function(s,h,k){return pe.current.useReducer(s,h,k)},S.useRef=function(s){return pe.current.useRef(s)},S.useState=function(s){return pe.current.useState(s)},S.useSyncExternalStore=function(s,h,k){return pe.current.useSyncExternalStore(s,h,k)},S.useTransition=function(){return pe.current.useTransition()},S.version="18.3.1"})})();ha=window.React,g=ha,{useState:Mt,useEffect:Ai,useCallback:kd,useMemo:Ed,useRef:Cd,useContext:Nd,createContext:_d,Fragment:zd,StrictMode:Pd,createElement:Td,Component:Ld}=ha});ql();(function(){"use strict";(function(S,j){typeof exports=="object"&&typeof module<"u"?j(exports,(ql(),Sd(ga))):typeof define=="function"&&define.amd?define(["exports","react"],j):(S=S||self,j(S.ReactDOM={},S.React))})(this,function(S,j){function p(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,n=1;n<arguments.length;n++)t+="&args[]="+encodeURIComponent(arguments[n]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}function b(e,t){q(e,t),q(e+"Capture",t)}function q(e,t){for(kr[e]=t,e=0;e<t.length;e++)Fs.add(t[e])}function Dt(e){return qo.call(js,e)?!0:qo.call(Is,e)?!1:lc.test(e)?js[e]=!0:(Is[e]=!0,!1)}function Ft(e,t,n,r){if(n!==null&&n.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return r?!1:n!==null?!n.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function It(e,t,n,r){if(t===null||typeof t>"u"||Ft(e,t,n,r))return!0;if(r)return!1;if(n!==null)switch(n.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function G(e,t,n,r,l,o,i){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=r,this.attributeNamespace=l,this.mustUseProperty=n,this.propertyName=e,this.type=t,this.sanitizeURL=o,this.removeEmptyString=i}function qe(e,t,n,r){var l=me.hasOwnProperty(t)?me[t]:null;(l!==null?l.type!==0:r||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(It(t,n,l,r)&&(n=null),r||l===null?Dt(t)&&(n===null?e.removeAttribute(t):e.setAttribute(t,""+n)):l.mustUseProperty?e[l.propertyName]=n===null?l.type===3?!1:"":n:(t=l.attributeName,r=l.attributeNamespace,n===null?e.removeAttribute(t):(l=l.type,n=l===3||l===4&&n===!0?"":""+n,r?e.setAttributeNS(r,t,n):e.setAttribute(t,n))))}function ke(e){return e===null||typeof e!="object"?null:(e=$s&&e[$s]||e["@@iterator"],typeof e=="function"?e:null)}function Ie(e,t,n){if(si===void 0)try{throw Error()}catch(r){si=(t=r.stack.trim().match(/\n( *(at )?)/))&&t[1]||""}return`
`+si+e}function on(e,t){if(!e||ai)return"";ai=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(m){var r=m}Reflect.construct(e,[],t)}else{try{t.call()}catch(m){r=m}e.call(t.prototype)}else{try{throw Error()}catch(m){r=m}e()}}catch(m){if(m&&r&&typeof m.stack=="string"){for(var l=m.stack.split(`
`),o=r.stack.split(`
`),i=l.length-1,u=o.length-1;1<=i&&0<=u&&l[i]!==o[u];)u--;for(;1<=i&&0<=u;i--,u--)if(l[i]!==o[u]){if(i!==1||u!==1)do if(i--,u--,0>u||l[i]!==o[u]){var a=`
`+l[i].replace(" at new "," at ");return e.displayName&&a.includes("<anonymous>")&&(a=a.replace("<anonymous>",e.displayName)),a}while(1<=i&&0<=u);break}}}finally{ai=!1,Error.prepareStackTrace=n}return(e=e?e.displayName||e.name:"")?Ie(e):""}function ft(e){switch(e.tag){case 5:return Ie(e.type);case 16:return Ie("Lazy");case 13:return Ie("Suspense");case 19:return Ie("SuspenseList");case 0:case 2:case 15:return e=on(e.type,!1),e;case 11:return e=on(e.type.render,!1),e;case 1:return e=on(e.type,!0),e;default:return""}}function te(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case Hn:return"Fragment";case Vn:return"Portal";case ri:return"Profiler";case ni:return"StrictMode";case oi:return"Suspense";case ii:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case Os:return(e.displayName||"Context")+".Consumer";case Us:return(e._context.displayName||"Context")+".Provider";case li:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case ui:return t=e.displayName||null,t!==null?t:te(e.type)||"Memo";case Xt:t=e._payload,e=e._init;try{return te(e(t))}catch{}}return null}function Ee(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return te(t);case 8:return t===ni?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function ye(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function jt(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function Ut(e){var t=jt(e)?"checked":"value",n=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),r=""+e[t];if(!e.hasOwnProperty(t)&&typeof n<"u"&&typeof n.get=="function"&&typeof n.set=="function"){var l=n.get,o=n.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return l.call(this)},set:function(i){r=""+i,o.call(this,i)}}),Object.defineProperty(e,t,{enumerable:n.enumerable}),{getValue:function(){return r},setValue:function(i){r=""+i},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function et(e){e._valueTracker||(e._valueTracker=Ut(e))}function Ot(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),r="";return e&&(r=jt(e)?e.checked?"true":"false":e.value),e=r,e!==n?(t.setValue(e),!0):!1}function tt(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function pt(e,t){var n=t.checked;return Y({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:n??e._wrapperState.initialChecked})}function un(e,t){var n=t.defaultValue==null?"":t.defaultValue,r=t.checked!=null?t.checked:t.defaultChecked;n=ye(t.value!=null?t.value:n),e._wrapperState={initialChecked:r,initialValue:n,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function nt(e,t){t=t.checked,t!=null&&qe(e,"checked",t,!1)}function Rt(e,t){nt(e,t);var n=ye(t.value),r=t.type;if(n!=null)r==="number"?(n===0&&e.value===""||e.value!=n)&&(e.value=""+n):e.value!==""+n&&(e.value=""+n);else if(r==="submit"||r==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?P(e,t.type,n):t.hasOwnProperty("defaultValue")&&P(e,t.type,ye(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function sn(e,t,n){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var r=t.type;if(!(r!=="submit"&&r!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,n||t===e.value||(e.value=t),e.defaultValue=t}n=e.name,n!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,n!==""&&(e.name=n)}function P(e,t,n){(t!=="number"||tt(e.ownerDocument)!==e)&&(n==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+n&&(e.defaultValue=""+n))}function le(e,t,n,r){if(e=e.options,t){t={};for(var l=0;l<n.length;l++)t["$"+n[l]]=!0;for(n=0;n<e.length;n++)l=t.hasOwnProperty("$"+e[n].value),e[n].selected!==l&&(e[n].selected=l),l&&r&&(e[n].defaultSelected=!0)}else{for(n=""+ye(n),t=null,l=0;l<e.length;l++){if(e[l].value===n){e[l].selected=!0,r&&(e[l].defaultSelected=!0);return}t!==null||e[l].disabled||(t=e[l])}t!==null&&(t.selected=!0)}}function ne(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(p(91));return Y({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function mt(e,t){var n=t.value;if(n==null){if(n=t.children,t=t.defaultValue,n!=null){if(t!=null)throw Error(p(92));if(Er(n)){if(1<n.length)throw Error(p(93));n=n[0]}t=n}t==null&&(t=""),n=t}e._wrapperState={initialValue:ye(n)}}function an(e,t){var n=ye(t.value),r=ye(t.defaultValue);n!=null&&(n=""+n,n!==e.value&&(e.value=n),t.defaultValue==null&&e.defaultValue!==n&&(e.defaultValue=n)),r!=null&&(e.defaultValue=""+r)}function rt(e,t){t=e.textContent,t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function En(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function nr(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?En(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}function rr(e,t,n){return t==null||typeof t=="boolean"||t===""?"":n||typeof t!="number"||t===0||Nr.hasOwnProperty(e)&&Nr[e]?(""+t).trim():t+"px"}function lr(e,t){e=e.style;for(var n in t)if(t.hasOwnProperty(n)){var r=n.indexOf("--")===0,l=rr(n,t[n],r);n==="float"&&(n="cssFloat"),r?e.setProperty(n,l):e[n]=l}}function Cn(e,t){if(t){if(ic[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(p(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(p(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(p(61))}if(t.style!=null&&typeof t.style!="object")throw Error(p(62))}}function Nn(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}function Re(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}function or(e){if(e=hr(e)){if(typeof di!="function")throw Error(p(280));var t=e.stateNode;t&&(t=nl(t),di(e.stateNode,e.type,t))}}function ir(e){An?Bn?Bn.push(e):Bn=[e]:An=e}function _n(){if(An){var e=An,t=Bn;if(Bn=An=null,or(e),t)for(e=0;e<t.length;e++)or(t[e])}}function ur(e,t,n){if(fi)return e(t,n);fi=!0;try{return Vs(e,t,n)}finally{fi=!1,(An!==null||Bn!==null)&&(Hs(),_n())}}function $t(e,t){var n=e.stateNode;if(n===null)return null;var r=nl(n);if(r===null)return null;n=r[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(r=!r.disabled)||(e=e.type,r=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!r;break e;default:e=!1}if(e)return null;if(n&&typeof n!="function")throw Error(p(231,t,typeof n));return n}function pe(e,t,n,r,l,o,i,u,a){zr=!1,Cl=null,uc.apply(sc,arguments)}function zn(e,t,n,r,l,o,i,u,a){if(pe.apply(this,arguments),zr){if(zr){var m=Cl;zr=!1,Cl=null}else throw Error(p(198));Nl||(Nl=!0,mi=m)}}function ht(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function lt(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function sr(e){if(ht(e)!==e)throw Error(p(188))}function eo(e){var t=e.alternate;if(!t){if(t=ht(e),t===null)throw Error(p(188));return t!==e?null:e}for(var n=e,r=t;;){var l=n.return;if(l===null)break;var o=l.alternate;if(o===null){if(r=l.return,r!==null){n=r;continue}break}if(l.child===o.child){for(o=l.child;o;){if(o===n)return sr(l),e;if(o===r)return sr(l),t;o=o.sibling}throw Error(p(188))}if(n.return!==r.return)n=l,r=o;else{for(var i=!1,u=l.child;u;){if(u===n){i=!0,n=l,r=o;break}if(u===r){i=!0,r=l,n=o;break}u=u.sibling}if(!i){for(u=o.child;u;){if(u===n){i=!0,n=o,r=l;break}if(u===r){i=!0,r=o,n=l;break}u=u.sibling}if(!i)throw Error(p(189))}}if(n.alternate!==r)throw Error(p(190))}if(n.tag!==3)throw Error(p(188));return n.stateNode.current===n?e:t}function je(e){return e=eo(e),e!==null?Be(e):null}function Be(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=Be(e);if(t!==null)return t;e=e.sibling}return null}function to(e,t){if(st&&typeof st.onCommitFiberRoot=="function")try{st.onCommitFiberRoot(zl,e,void 0,(e.current.flags&128)===128)}catch{}}function Pe(e){return e>>>=0,e===0?32:31-(pc(e)/mc|0)|0}function J(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function gt(e,t){var n=e.pendingLanes;if(n===0)return 0;var r=0,l=e.suspendedLanes,o=e.pingedLanes,i=n&268435455;if(i!==0){var u=i&~l;u!==0?r=J(u):(o&=i,o!==0&&(r=J(o)))}else i=n&~l,i!==0?r=J(i):o!==0&&(r=J(o));if(r===0)return 0;if(t!==0&&t!==r&&!(t&l)&&(l=r&-r,o=t&-t,l>=o||l===16&&(o&4194240)!==0))return t;if(r&4&&(r|=n&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=r;0<t;)n=31-Ge(t),l=1<<n,r|=e[n],t&=~l;return r}function vt(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function cn(e,t){for(var n=e.suspendedLanes,r=e.pingedLanes,l=e.expirationTimes,o=e.pendingLanes;0<o;){var i=31-Ge(o),u=1<<i,a=l[i];a===-1?(!(u&n)||u&r)&&(l[i]=vt(u,t)):a<=t&&(e.expiredLanes|=u),o&=~u}}function Pn(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function ar(){var e=Pl;return Pl<<=1,!(Pl&4194240)&&(Pl=64),e}function Tn(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function ot(e,t,n){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Ge(t),e[t]=n}function Ln(e,t){var n=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var r=e.eventTimes;for(e=e.expirationTimes;0<n;){var l=31-Ge(n),o=1<<l;t[l]=0,r[l]=-1,e[l]=-1,n&=~o}}function yt(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var r=31-Ge(n),l=1<<r;l&t|e[r]&t&&(e[r]|=t),n&=~l}}function cr(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}function dr(e,t){switch(e){case"focusin":case"focusout":Gt=null;break;case"dragenter":case"dragleave":Jt=null;break;case"mouseover":case"mouseout":Zt=null;break;case"pointerover":case"pointerout":Pr.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Tr.delete(t.pointerId)}}function wt(e,t,n,r,l,o){return e===null||e.nativeEvent!==o?(e={blockedOn:t,domEventName:n,eventSystemFlags:r,nativeEvent:o,targetContainers:[l]},t!==null&&(t=hr(t),t!==null&&ma(t)),e):(e.eventSystemFlags|=r,t=e.targetContainers,l!==null&&t.indexOf(l)===-1&&t.push(l),e)}function Mn(e,t,n,r,l){switch(t){case"focusin":return Gt=wt(Gt,e,t,n,r,l),!0;case"dragenter":return Jt=wt(Jt,e,t,n,r,l),!0;case"mouseover":return Zt=wt(Zt,e,t,n,r,l),!0;case"pointerover":var o=l.pointerId;return Pr.set(o,wt(Pr.get(o)||null,e,t,n,r,l)),!0;case"gotpointercapture":return o=l.pointerId,Tr.set(o,wt(Tr.get(o)||null,e,t,n,r,l)),!0}return!1}function Kr(e){var t=dn(e.target);if(t!==null){var n=ht(t);if(n!==null){if(t=n.tag,t===13){if(t=lt(n),t!==null){e.blockedOn=t,fd(e.priority,function(){cd(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function s(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=U(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(n===null){n=e.nativeEvent;var r=new n.constructor(n.type,n);ci=r,n.target.dispatchEvent(r),ci=null}else return t=hr(n),t!==null&&ma(t),e.blockedOn=n,!1;t.shift()}return!0}function h(e,t,n){s(e)&&n.delete(t)}function k(){gi=!1,Gt!==null&&s(Gt)&&(Gt=null),Jt!==null&&s(Jt)&&(Jt=null),Zt!==null&&s(Zt)&&(Zt=null),Pr.forEach(h),Tr.forEach(h)}function T(e,t){e.blockedOn===t&&(e.blockedOn=null,gi||(gi=!0,As(Bs,k)))}function D(e){if(0<Ll.length){T(Ll[0],e);for(var t=1;t<Ll.length;t++){var n=Ll[t];n.blockedOn===e&&(n.blockedOn=null)}}for(Gt!==null&&T(Gt,e),Jt!==null&&T(Jt,e),Zt!==null&&T(Zt,e),t=function(r){return T(r,e)},Pr.forEach(t),Tr.forEach(t),t=0;t<bt.length;t++)n=bt[t],n.blockedOn===e&&(n.blockedOn=null);for(;0<bt.length&&(t=bt[0],t.blockedOn===null);)Kr(t),t.blockedOn===null&&bt.shift()}function H(e,t,n,r){var l=R,o=Qn.transition;Qn.transition=null;try{R=1,V(e,t,n,r)}finally{R=l,Qn.transition=o}}function W(e,t,n,r){var l=R,o=Qn.transition;Qn.transition=null;try{R=4,V(e,t,n,r)}finally{R=l,Qn.transition=o}}function V(e,t,n,r){if(Ml){var l=U(e,t,n,r);if(l===null)oo(e,t,r,Dl,n),dr(e,r);else if(Mn(l,e,t,n,r))r.stopPropagation();else if(dr(e,r),t&4&&-1<hc.indexOf(e)){for(;l!==null;){var o=hr(l);if(o!==null&&ad(o),o=U(e,t,n,r),o===null&&oo(e,t,r,Dl,n),o===l)break;l=o}l!==null&&r.stopPropagation()}else oo(e,t,r,null,n)}}function U(e,t,n,r){if(Dl=null,e=Re(r),e=dn(e),e!==null)if(t=ht(e),t===null)e=null;else if(n=t.tag,n===13){if(e=lt(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Dl=e,null}function oe(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(dc()){case hi:return 1;case Ks:return 4;case _l:case fc:return 16;case Xs:return 536870912;default:return 16}default:return 16}}function Bi(){if(Fl)return Fl;var e,t=vi,n=t.length,r,l="value"in qt?qt.value:qt.textContent,o=l.length;for(e=0;e<n&&t[e]===l[e];e++);var i=n-e;for(r=1;r<=i&&t[n-r]===l[o-r];r++);return Fl=l.slice(e,1<r?1-r:void 0)}function Xr(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function Gr(){return!0}function Qi(){return!1}function Ue(e){function t(n,r,l,o,i){this._reactName=n,this._targetInst=l,this.type=r,this.nativeEvent=o,this.target=i,this.currentTarget=null;for(var u in e)e.hasOwnProperty(u)&&(n=e[u],this[u]=n?n(o):o[u]);return this.isDefaultPrevented=(o.defaultPrevented!=null?o.defaultPrevented:o.returnValue===!1)?Gr:Qi,this.isPropagationStopped=Qi,this}return Y(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var n=this.nativeEvent;n&&(n.preventDefault?n.preventDefault():typeof n.returnValue!="unknown"&&(n.returnValue=!1),this.isDefaultPrevented=Gr)},stopPropagation:function(){var n=this.nativeEvent;n&&(n.stopPropagation?n.stopPropagation():typeof n.cancelBubble!="unknown"&&(n.cancelBubble=!0),this.isPropagationStopped=Gr)},persist:function(){},isPersistent:Gr}),t}function Sa(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Pc[e])?!!t[e]:!1}function no(e){return Sa}function Yi(e,t){switch(e){case"keyup":return Rc.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Ki(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}function ka(e,t){switch(e){case"compositionend":return Ki(t);case"keypress":return t.which!==32?null:(ea=!0,qs);case"textInput":return e=t.data,e===qs&&ea?null:e;default:return null}}function Ea(e,t){if(Kn)return e==="compositionend"||!ki&&Yi(e,t)?(e=Bi(),Fl=vi=qt=null,Kn=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return bs&&t.locale!=="ko"?null:t.data;default:return null}}function Xi(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Wc[e.type]:t==="textarea"}function Ca(e){if(!Ct)return!1;e="on"+e;var t=e in document;return t||(t=document.createElement("div"),t.setAttribute(e,"return;"),t=typeof t[e]=="function"),t}function Gi(e,t,n,r){ir(r),t=qr(t,"onChange"),0<t.length&&(n=new yi("onChange","change",null,n,r),e.push({event:n,listeners:t}))}function Na(e){lu(e,0)}function Jr(e){var t=Fn(e);if(Ot(t))return e}function _a(e,t){if(e==="change")return t}function Ji(){Fr&&(Fr.detachEvent("onpropertychange",Zi),Ir=Fr=null)}function Zi(e){if(e.propertyName==="value"&&Jr(Ir)){var t=[];Gi(t,Ir,e,Re(e)),ur(Na,t)}}function za(e,t,n){e==="focusin"?(Ji(),Fr=t,Ir=n,Fr.attachEvent("onpropertychange",Zi)):e==="focusout"&&Ji()}function Pa(e,t){if(e==="selectionchange"||e==="keyup"||e==="keydown")return Jr(Ir)}function Ta(e,t){if(e==="click")return Jr(t)}function La(e,t){if(e==="input"||e==="change")return Jr(t)}function Ma(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}function fr(e,t){if(Je(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var n=Object.keys(e),r=Object.keys(t);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var l=n[r];if(!qo.call(t,l)||!Je(e[l],t[l]))return!1}return!0}function bi(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function qi(e,t){var n=bi(e);e=0;for(var r;n;){if(n.nodeType===3){if(r=e+n.textContent.length,e<=t&&r>=t)return{node:n,offset:t-e};e=r}e:{for(;n;){if(n.nextSibling){n=n.nextSibling;break e}n=n.parentNode}n=void 0}n=bi(n)}}function eu(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?eu(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function tu(){for(var e=window,t=tt();t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href=="string"}catch{n=!1}if(n)e=t.contentWindow;else break;t=tt(e.document)}return t}function ro(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function Da(e){var t=tu(),n=e.focusedElem,r=e.selectionRange;if(t!==n&&n&&n.ownerDocument&&eu(n.ownerDocument.documentElement,n)){if(r!==null&&ro(n)){if(t=r.start,e=r.end,e===void 0&&(e=t),"selectionStart"in n)n.selectionStart=t,n.selectionEnd=Math.min(e,n.value.length);else if(e=(t=n.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var l=n.textContent.length,o=Math.min(r.start,l);r=r.end===void 0?o:Math.min(r.end,l),!e.extend&&o>r&&(l=r,r=o,o=l),l=qi(n,o);var i=qi(n,r);l&&i&&(e.rangeCount!==1||e.anchorNode!==l.node||e.anchorOffset!==l.offset||e.focusNode!==i.node||e.focusOffset!==i.offset)&&(t=t.createRange(),t.setStart(l.node,l.offset),e.removeAllRanges(),o>r?(e.addRange(t),e.extend(i.node,i.offset)):(t.setEnd(i.node,i.offset),e.addRange(t)))}}for(t=[],e=n;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof n.focus=="function"&&n.focus(),n=0;n<t.length;n++)e=t[n],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}function nu(e,t,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Ci||Xn==null||Xn!==tt(r)||(r=Xn,"selectionStart"in r&&ro(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),jr&&fr(jr,r)||(jr=r,r=qr(Ei,"onSelect"),0<r.length&&(t=new yi("onSelect","select",null,t,n),e.push({event:t,listeners:r}),t.target=Xn)))}function Zr(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n["Webkit"+e]="webkit"+t,n["Moz"+e]="moz"+t,n}function br(e){if(Ni[e])return Ni[e];if(!Gn[e])return e;var t=Gn[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in na)return Ni[e]=t[n];return e}function Wt(e,t){ua.set(e,t),b(t,[e])}function ru(e,t,n){var r=e.type||"unknown-event";e.currentTarget=n,zn(r,t,void 0,e),e.currentTarget=null}function lu(e,t){t=(t&4)!==0;for(var n=0;n<e.length;n++){var r=e[n],l=r.event;r=r.listeners;e:{var o=void 0;if(t)for(var i=r.length-1;0<=i;i--){var u=r[i],a=u.instance,m=u.currentTarget;if(u=u.listener,a!==o&&l.isPropagationStopped())break e;ru(l,u,m),o=a}else for(i=0;i<r.length;i++){if(u=r[i],a=u.instance,m=u.currentTarget,u=u.listener,a!==o&&l.isPropagationStopped())break e;ru(l,u,m),o=a}}}if(Nl)throw e=mi,Nl=!1,mi=null,e}function B(e,t){var n=t[Ti];n===void 0&&(n=t[Ti]=new Set);var r=e+"__bubble";n.has(r)||(ou(t,e,2,!1),n.add(r))}function lo(e,t,n){var r=0;t&&(r|=4),ou(n,e,r,t)}function pr(e){if(!e[jl]){e[jl]=!0,Fs.forEach(function(n){n!=="selectionchange"&&(Hc.has(n)||lo(n,!1,e),lo(n,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[jl]||(t[jl]=!0,lo("selectionchange",!1,t))}}function ou(e,t,n,r,l){switch(oe(t)){case 1:l=H;break;case 4:l=W;break;default:l=V}n=l.bind(null,t,n,e),l=void 0,!pi||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(l=!0),r?l!==void 0?e.addEventListener(t,n,{capture:!0,passive:l}):e.addEventListener(t,n,!0):l!==void 0?e.addEventListener(t,n,{passive:l}):e.addEventListener(t,n,!1)}function oo(e,t,n,r,l){var o=r;if(!(t&1)&&!(t&2)&&r!==null)e:for(;;){if(r===null)return;var i=r.tag;if(i===3||i===4){var u=r.stateNode.containerInfo;if(u===l||u.nodeType===8&&u.parentNode===l)break;if(i===4)for(i=r.return;i!==null;){var a=i.tag;if((a===3||a===4)&&(a=i.stateNode.containerInfo,a===l||a.nodeType===8&&a.parentNode===l))return;i=i.return}for(;u!==null;){if(i=dn(u),i===null)return;if(a=i.tag,a===5||a===6){r=o=i;continue e}u=u.parentNode}}r=r.return}ur(function(){var m=o,y=Re(n),w=[];e:{var v=ua.get(e);if(v!==void 0){var E=yi,N=e;switch(e){case"keypress":if(Xr(n)===0)break e;case"keydown":case"keyup":E=Lc;break;case"focusin":N="focus",E=Si;break;case"focusout":N="blur",E=Si;break;case"beforeblur":case"afterblur":E=Si;break;case"click":if(n.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":E=Gs;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":E=yc;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":E=Fc;break;case ra:case la:case oa:E=Sc;break;case ia:E=jc;break;case"scroll":E=gc;break;case"wheel":E=Oc;break;case"copy":case"cut":case"paste":E=Ec;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":E=Zs}var _=(t&4)!==0,ee=!_&&e==="scroll",d=_?v!==null?v+"Capture":null:v;_=[];for(var c=m,f;c!==null;){f=c;var x=f.stateNode;if(f.tag===5&&x!==null&&(f=x,d!==null&&(x=$t(c,d),x!=null&&_.push(mr(c,x,f)))),ee)break;c=c.return}0<_.length&&(v=new E(v,N,null,n,y),w.push({event:v,listeners:_}))}}if(!(t&7)){e:{if(v=e==="mouseover"||e==="pointerover",E=e==="mouseout"||e==="pointerout",v&&n!==ci&&(N=n.relatedTarget||n.fromElement)&&(dn(N)||N[_t]))break e;if((E||v)&&(v=y.window===y?y:(v=y.ownerDocument)?v.defaultView||v.parentWindow:window,E?(N=n.relatedTarget||n.toElement,E=m,N=N?dn(N):null,N!==null&&(ee=ht(N),N!==ee||N.tag!==5&&N.tag!==6)&&(N=null)):(E=null,N=m),E!==N)){if(_=Gs,x="onMouseLeave",d="onMouseEnter",c="mouse",(e==="pointerout"||e==="pointerover")&&(_=Zs,x="onPointerLeave",d="onPointerEnter",c="pointer"),ee=E==null?v:Fn(E),f=N==null?v:Fn(N),v=new _(x,c+"leave",E,n,y),v.target=ee,v.relatedTarget=f,x=null,dn(y)===m&&(_=new _(d,c+"enter",N,n,y),_.target=f,_.relatedTarget=ee,x=_),ee=x,E&&N)t:{for(_=E,d=N,c=0,f=_;f;f=Dn(f))c++;for(f=0,x=d;x;x=Dn(x))f++;for(;0<c-f;)_=Dn(_),c--;for(;0<f-c;)d=Dn(d),f--;for(;c--;){if(_===d||d!==null&&_===d.alternate)break t;_=Dn(_),d=Dn(d)}_=null}else _=null;E!==null&&iu(w,v,E,_,!1),N!==null&&ee!==null&&iu(w,ee,N,_,!0)}}e:{if(v=m?Fn(m):window,E=v.nodeName&&v.nodeName.toLowerCase(),E==="select"||E==="input"&&v.type==="file")var z=_a;else if(Xi(v))if(ta)z=La;else{z=Pa;var L=za}else(E=v.nodeName)&&E.toLowerCase()==="input"&&(v.type==="checkbox"||v.type==="radio")&&(z=Ta);if(z&&(z=z(e,m))){Gi(w,z,n,y);break e}L&&L(e,v,m),e==="focusout"&&(L=v._wrapperState)&&L.controlled&&v.type==="number"&&P(v,"number",v.value)}switch(L=m?Fn(m):window,e){case"focusin":(Xi(L)||L.contentEditable==="true")&&(Xn=L,Ei=m,jr=null);break;case"focusout":jr=Ei=Xn=null;break;case"mousedown":Ci=!0;break;case"contextmenu":case"mouseup":case"dragend":Ci=!1,nu(w,n,y);break;case"selectionchange":if(Vc)break;case"keydown":case"keyup":nu(w,n,y)}var M;if(ki)e:{switch(e){case"compositionstart":var F="onCompositionStart";break e;case"compositionend":F="onCompositionEnd";break e;case"compositionupdate":F="onCompositionUpdate";break e}F=void 0}else Kn?Yi(e,n)&&(F="onCompositionEnd"):e==="keydown"&&n.keyCode===229&&(F="onCompositionStart");F&&(bs&&n.locale!=="ko"&&(Kn||F!=="onCompositionStart"?F==="onCompositionEnd"&&Kn&&(M=Bi()):(qt=y,vi="value"in qt?qt.value:qt.textContent,Kn=!0)),L=qr(m,F),0<L.length&&(F=new Js(F,e,null,n,y),w.push({event:F,listeners:L}),M?F.data=M:(M=Ki(n),M!==null&&(F.data=M)))),(M=$c?ka(e,n):Ea(e,n))&&(m=qr(m,"onBeforeInput"),0<m.length&&(y=new Nc("onBeforeInput","beforeinput",null,n,y),w.push({event:y,listeners:m}),y.data=M))}lu(w,t)})}function mr(e,t,n){return{instance:e,listener:t,currentTarget:n}}function qr(e,t){for(var n=t+"Capture",r=[];e!==null;){var l=e,o=l.stateNode;l.tag===5&&o!==null&&(l=o,o=$t(e,n),o!=null&&r.unshift(mr(e,o,l)),o=$t(e,t),o!=null&&r.push(mr(e,o,l))),e=e.return}return r}function Dn(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function iu(e,t,n,r,l){for(var o=t._reactName,i=[];n!==null&&n!==r;){var u=n,a=u.alternate,m=u.stateNode;if(a!==null&&a===r)break;u.tag===5&&m!==null&&(u=m,l?(a=$t(n,o),a!=null&&i.unshift(mr(n,a,u))):l||(a=$t(n,o),a!=null&&i.push(mr(n,a,u)))),n=n.return}i.length!==0&&e.push({event:t,listeners:i})}function uu(e){return(typeof e=="string"?e:""+e).replace(Ac,`
`).replace(Bc,"")}function el(e,t,n,r){if(t=uu(t),uu(e)!==t&&n)throw Error(p(425))}function tl(){}function io(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}function Fa(e){setTimeout(function(){throw e})}function uo(e,t){var n=t,r=0;do{var l=n.nextSibling;if(e.removeChild(n),l&&l.nodeType===8)if(n=l.data,n==="/$"){if(r===0){e.removeChild(l),D(t);return}r--}else n!=="$"&&n!=="$?"&&n!=="$!"||r++;n=l}while(n);D(t)}function xt(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function su(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="$"||n==="$!"||n==="$?"){if(t===0)return e;t--}else n==="/$"&&t++}e=e.previousSibling}return null}function dn(e){var t=e[at];if(t)return t;for(var n=e.parentNode;n;){if(t=n[_t]||n[at]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=su(e);e!==null;){if(n=e[at])return n;e=su(e)}return t}e=n,n=e.parentNode}return null}function hr(e){return e=e[at]||e[_t],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Fn(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(p(33))}function nl(e){return e[Or]||null}function Vt(e){return{current:e}}function O(e,t){0>Zn||(e.current=Li[Zn],Li[Zn]=null,Zn--)}function A(e,t,n){Zn++,Li[Zn]=e.current,e.current=t}function In(e,t){var n=e.type.contextTypes;if(!n)return en;var r=e.stateNode;if(r&&r.__reactInternalMemoizedUnmaskedChildContext===t)return r.__reactInternalMemoizedMaskedChildContext;var l={},o;for(o in n)l[o]=t[o];return r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=l),l}function Te(e){return e=e.childContextTypes,e!=null}function au(e,t,n){if(ie.current!==en)throw Error(p(168));A(ie,t),A(he,n)}function cu(e,t,n){var r=e.stateNode;if(t=t.childContextTypes,typeof r.getChildContext!="function")return n;r=r.getChildContext();for(var l in r)if(!(l in t))throw Error(p(108,Ee(e)||"Unknown",l));return Y({},n,r)}function rl(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||en,yn=ie.current,A(ie,e),A(he,he.current),!0}function du(e,t,n){var r=e.stateNode;if(!r)throw Error(p(169));n?(e=cu(e,t,yn),r.__reactInternalMemoizedMergedChildContext=e,O(he),O(ie),A(ie,e)):O(he),A(he,n)}function fu(e){zt===null?zt=[e]:zt.push(e)}function Ia(e){Ul=!0,fu(e)}function Ht(){if(!Mi&&zt!==null){Mi=!0;var e=0,t=R;try{var n=zt;for(R=1;e<n.length;e++){var r=n[e];do r=r(!0);while(r!==null)}zt=null,Ul=!1}catch(l){throw zt!==null&&(zt=zt.slice(e+1)),Qs(hi,Ht),l}finally{R=t,Mi=!1}}return null}function fn(e,t){bn[qn++]=Rl,bn[qn++]=Ol,Ol=e,Rl=t}function pu(e,t,n){Ve[He++]=Pt,Ve[He++]=Tt,Ve[He++]=wn,wn=e;var r=Pt;e=Tt;var l=32-Ge(r)-1;r&=~(1<<l),n+=1;var o=32-Ge(t)+l;if(30<o){var i=l-l%5;o=(r&(1<<i)-1).toString(32),r>>=i,l-=i,Pt=1<<32-Ge(t)+l|n<<l|r,Tt=o+e}else Pt=1<<o|n<<l|r,Tt=e}function so(e){e.return!==null&&(fn(e,1),pu(e,1,0))}function ao(e){for(;e===Ol;)Ol=bn[--qn],bn[qn]=null,Rl=bn[--qn],bn[qn]=null;for(;e===wn;)wn=Ve[--He],Ve[He]=null,Tt=Ve[--He],Ve[He]=null,Pt=Ve[--He],Ve[He]=null}function mu(e,t){var n=Ae(5,null,null,0);n.elementType="DELETED",n.stateNode=t,n.return=e,t=e.deletions,t===null?(e.deletions=[n],e.flags|=16):t.push(n)}function hu(e,t){switch(e.tag){case 5:var n=e.type;return t=t.nodeType!==1||n.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,Oe=e,Me=xt(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,Oe=e,Me=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(n=wn!==null?{id:Pt,overflow:Tt}:null,e.memoizedState={dehydrated:t,treeContext:n,retryLane:1073741824},n=Ae(18,null,null,0),n.stateNode=t,n.return=e,e.child=n,Oe=e,Me=null,!0):!1;default:return!1}}function co(e){return(e.mode&1)!==0&&(e.flags&128)===0}function fo(e){if(Q){var t=Me;if(t){var n=t;if(!hu(e,t)){if(co(e))throw Error(p(418));t=xt(n.nextSibling);var r=Oe;t&&hu(e,t)?mu(r,n):(e.flags=e.flags&-4097|2,Q=!1,Oe=e)}}else{if(co(e))throw Error(p(418));e.flags=e.flags&-4097|2,Q=!1,Oe=e}}}function gu(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;Oe=e}function ll(e){if(e!==Oe)return!1;if(!Q)return gu(e),Q=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!io(e.type,e.memoizedProps)),t&&(t=Me)){if(co(e)){for(e=Me;e;)e=xt(e.nextSibling);throw Error(p(418))}for(;t;)mu(e,t),t=xt(t.nextSibling)}if(gu(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(p(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var n=e.data;if(n==="/$"){if(t===0){Me=xt(e.nextSibling);break e}t--}else n!=="$"&&n!=="$!"&&n!=="$?"||t++}e=e.nextSibling}Me=null}}else Me=Oe?xt(e.stateNode.nextSibling):null;return!0}function jn(){Me=Oe=null,Q=!1}function po(e){Ze===null?Ze=[e]:Ze.push(e)}function gr(e,t,n){if(e=n.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(n._owner){if(n=n._owner,n){if(n.tag!==1)throw Error(p(309));var r=n.stateNode}if(!r)throw Error(p(147,e));var l=r,o=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===o?t.ref:(t=function(i){var u=l.refs;i===null?delete u[o]:u[o]=i},t._stringRef=o,t)}if(typeof e!="string")throw Error(p(284));if(!n._owner)throw Error(p(290,e))}return e}function ol(e,t){throw e=Object.prototype.toString.call(t),Error(p(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function vu(e){var t=e._init;return t(e._payload)}function yu(e){function t(d,c){if(e){var f=d.deletions;f===null?(d.deletions=[c],d.flags|=16):f.push(c)}}function n(d,c){if(!e)return null;for(;c!==null;)t(d,c),c=c.sibling;return null}function r(d,c){for(d=new Map;c!==null;)c.key!==null?d.set(c.key,c):d.set(c.index,c),c=c.sibling;return d}function l(d,c){return d=Kt(d,c),d.index=0,d.sibling=null,d}function o(d,c,f){return d.index=f,e?(f=d.alternate,f!==null?(f=f.index,f<c?(d.flags|=2,c):f):(d.flags|=2,c)):(d.flags|=1048576,c)}function i(d){return e&&d.alternate===null&&(d.flags|=2),d}function u(d,c,f,x){return c===null||c.tag!==6?(c=Ko(f,d.mode,x),c.return=d,c):(c=l(c,f),c.return=d,c)}function a(d,c,f,x){var z=f.type;return z===Hn?y(d,c,f.props.children,x,f.key):c!==null&&(c.elementType===z||typeof z=="object"&&z!==null&&z.$$typeof===Xt&&vu(z)===c.type)?(x=l(c,f.props),x.ref=gr(d,c,f),x.return=d,x):(x=hl(f.type,f.key,f.props,null,d.mode,x),x.ref=gr(d,c,f),x.return=d,x)}function m(d,c,f,x){return c===null||c.tag!==4||c.stateNode.containerInfo!==f.containerInfo||c.stateNode.implementation!==f.implementation?(c=Xo(f,d.mode,x),c.return=d,c):(c=l(c,f.children||[]),c.return=d,c)}function y(d,c,f,x,z){return c===null||c.tag!==7?(c=vn(f,d.mode,x,z),c.return=d,c):(c=l(c,f),c.return=d,c)}function w(d,c,f){if(typeof c=="string"&&c!==""||typeof c=="number")return c=Ko(""+c,d.mode,f),c.return=d,c;if(typeof c=="object"&&c!==null){switch(c.$$typeof){case kl:return f=hl(c.type,c.key,c.props,null,d.mode,f),f.ref=gr(d,null,c),f.return=d,f;case Vn:return c=Xo(c,d.mode,f),c.return=d,c;case Xt:var x=c._init;return w(d,x(c._payload),f)}if(Er(c)||ke(c))return c=vn(c,d.mode,f,null),c.return=d,c;ol(d,c)}return null}function v(d,c,f,x){var z=c!==null?c.key:null;if(typeof f=="string"&&f!==""||typeof f=="number")return z!==null?null:u(d,c,""+f,x);if(typeof f=="object"&&f!==null){switch(f.$$typeof){case kl:return f.key===z?a(d,c,f,x):null;case Vn:return f.key===z?m(d,c,f,x):null;case Xt:return z=f._init,v(d,c,z(f._payload),x)}if(Er(f)||ke(f))return z!==null?null:y(d,c,f,x,null);ol(d,f)}return null}function E(d,c,f,x,z){if(typeof x=="string"&&x!==""||typeof x=="number")return d=d.get(f)||null,u(c,d,""+x,z);if(typeof x=="object"&&x!==null){switch(x.$$typeof){case kl:return d=d.get(x.key===null?f:x.key)||null,a(c,d,x,z);case Vn:return d=d.get(x.key===null?f:x.key)||null,m(c,d,x,z);case Xt:var L=x._init;return E(d,c,f,L(x._payload),z)}if(Er(x)||ke(x))return d=d.get(f)||null,y(c,d,x,z,null);ol(c,x)}return null}function N(d,c,f,x){for(var z=null,L=null,M=c,F=c=0,fe=null;M!==null&&F<f.length;F++){M.index>F?(fe=M,M=null):fe=M.sibling;var $=v(d,M,f[F],x);if($===null){M===null&&(M=fe);break}e&&M&&$.alternate===null&&t(d,M),c=o($,c,F),L===null?z=$:L.sibling=$,L=$,M=fe}if(F===f.length)return n(d,M),Q&&fn(d,F),z;if(M===null){for(;F<f.length;F++)M=w(d,f[F],x),M!==null&&(c=o(M,c,F),L===null?z=M:L.sibling=M,L=M);return Q&&fn(d,F),z}for(M=r(d,M);F<f.length;F++)fe=E(M,d,F,f[F],x),fe!==null&&(e&&fe.alternate!==null&&M.delete(fe.key===null?F:fe.key),c=o(fe,c,F),L===null?z=fe:L.sibling=fe,L=fe);return e&&M.forEach(function(ln){return t(d,ln)}),Q&&fn(d,F),z}function _(d,c,f,x){var z=ke(f);if(typeof z!="function")throw Error(p(150));if(f=z.call(f),f==null)throw Error(p(151));for(var L=z=null,M=c,F=c=0,fe=null,$=f.next();M!==null&&!$.done;F++,$=f.next()){M.index>F?(fe=M,M=null):fe=M.sibling;var ln=v(d,M,$.value,x);if(ln===null){M===null&&(M=fe);break}e&&M&&ln.alternate===null&&t(d,M),c=o(ln,c,F),L===null?z=ln:L.sibling=ln,L=ln,M=fe}if($.done)return n(d,M),Q&&fn(d,F),z;if(M===null){for(;!$.done;F++,$=f.next())$=w(d,$.value,x),$!==null&&(c=o($,c,F),L===null?z=$:L.sibling=$,L=$);return Q&&fn(d,F),z}for(M=r(d,M);!$.done;F++,$=f.next())$=E(M,d,F,$.value,x),$!==null&&(e&&$.alternate!==null&&M.delete($.key===null?F:$.key),c=o($,c,F),L===null?z=$:L.sibling=$,L=$);return e&&M.forEach(function(md){return t(d,md)}),Q&&fn(d,F),z}function ee(d,c,f,x){if(typeof f=="object"&&f!==null&&f.type===Hn&&f.key===null&&(f=f.props.children),typeof f=="object"&&f!==null){switch(f.$$typeof){case kl:e:{for(var z=f.key,L=c;L!==null;){if(L.key===z){if(z=f.type,z===Hn){if(L.tag===7){n(d,L.sibling),c=l(L,f.props.children),c.return=d,d=c;break e}}else if(L.elementType===z||typeof z=="object"&&z!==null&&z.$$typeof===Xt&&vu(z)===L.type){n(d,L.sibling),c=l(L,f.props),c.ref=gr(d,L,f),c.return=d,d=c;break e}n(d,L);break}else t(d,L);L=L.sibling}f.type===Hn?(c=vn(f.props.children,d.mode,x,f.key),c.return=d,d=c):(x=hl(f.type,f.key,f.props,null,d.mode,x),x.ref=gr(d,c,f),x.return=d,d=x)}return i(d);case Vn:e:{for(L=f.key;c!==null;){if(c.key===L)if(c.tag===4&&c.stateNode.containerInfo===f.containerInfo&&c.stateNode.implementation===f.implementation){n(d,c.sibling),c=l(c,f.children||[]),c.return=d,d=c;break e}else{n(d,c);break}else t(d,c);c=c.sibling}c=Xo(f,d.mode,x),c.return=d,d=c}return i(d);case Xt:return L=f._init,ee(d,c,L(f._payload),x)}if(Er(f))return N(d,c,f,x);if(ke(f))return _(d,c,f,x);ol(d,f)}return typeof f=="string"&&f!==""||typeof f=="number"?(f=""+f,c!==null&&c.tag===6?(n(d,c.sibling),c=l(c,f),c.return=d,d=c):(n(d,c),c=Ko(f,d.mode,x),c.return=d,d=c),i(d)):n(d,c)}return ee}function mo(){Di=tr=Wl=null}function ho(e,t){t=$l.current,O($l),e._currentValue=t}function go(e,t,n){for(;e!==null;){var r=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,r!==null&&(r.childLanes|=t)):r!==null&&(r.childLanes&t)!==t&&(r.childLanes|=t),e===n)break;e=e.return}}function Un(e,t){Wl=e,Di=tr=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(De=!0),e.firstContext=null)}function $e(e){var t=e._currentValue;if(Di!==e)if(e={context:e,memoizedValue:t,next:null},tr===null){if(Wl===null)throw Error(p(308));tr=e,Wl.dependencies={lanes:0,firstContext:e}}else tr=tr.next=e;return t}function vo(e){xn===null?xn=[e]:xn.push(e)}function wu(e,t,n,r){var l=t.interleaved;return l===null?(n.next=n,vo(t)):(n.next=l.next,l.next=n),t.interleaved=n,St(e,r)}function St(e,t){e.lanes|=t;var n=e.alternate;for(n!==null&&(n.lanes|=t),n=e,e=e.return;e!==null;)e.childLanes|=t,n=e.alternate,n!==null&&(n.childLanes|=t),n=e,e=e.return;return n.tag===3?n.stateNode:null}function yo(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function xu(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function kt(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function At(e,t,n){var r=e.updateQueue;if(r===null)return null;if(r=r.shared,I&2){var l=r.pending;return l===null?t.next=t:(t.next=l.next,l.next=t),r.pending=t,Jc(e,n)}return l=r.interleaved,l===null?(t.next=t,vo(r)):(t.next=l.next,l.next=t),r.interleaved=t,St(e,n)}function il(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,(n&4194240)!==0)){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,yt(e,n)}}function Su(e,t){var n=e.updateQueue,r=e.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var l=null,o=null;if(n=n.firstBaseUpdate,n!==null){do{var i={eventTime:n.eventTime,lane:n.lane,tag:n.tag,payload:n.payload,callback:n.callback,next:null};o===null?l=o=i:o=o.next=i,n=n.next}while(n!==null);o===null?l=o=t:o=o.next=t}else l=o=t;n={baseState:r.baseState,firstBaseUpdate:l,lastBaseUpdate:o,shared:r.shared,effects:r.effects},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}function ul(e,t,n,r){var l=e.updateQueue;tn=!1;var o=l.firstBaseUpdate,i=l.lastBaseUpdate,u=l.shared.pending;if(u!==null){l.shared.pending=null;var a=u,m=a.next;a.next=null,i===null?o=m:i.next=m,i=a;var y=e.alternate;y!==null&&(y=y.updateQueue,u=y.lastBaseUpdate,u!==i&&(u===null?y.firstBaseUpdate=m:u.next=m,y.lastBaseUpdate=a))}if(o!==null){var w=l.baseState;i=0,y=m=a=null,u=o;do{var v=u.lane,E=u.eventTime;if((r&v)===v){y!==null&&(y=y.next={eventTime:E,lane:0,tag:u.tag,payload:u.payload,callback:u.callback,next:null});e:{var N=e,_=u;switch(v=t,E=n,_.tag){case 1:if(N=_.payload,typeof N=="function"){w=N.call(E,w,v);break e}w=N;break e;case 3:N.flags=N.flags&-65537|128;case 0:if(N=_.payload,v=typeof N=="function"?N.call(E,w,v):N,v==null)break e;w=Y({},w,v);break e;case 2:tn=!0}}u.callback!==null&&u.lane!==0&&(e.flags|=64,v=l.effects,v===null?l.effects=[u]:v.push(u))}else E={eventTime:E,lane:v,tag:u.tag,payload:u.payload,callback:u.callback,next:null},y===null?(m=y=E,a=w):y=y.next=E,i|=v;if(u=u.next,u===null){if(u=l.shared.pending,u===null)break;v=u,u=v.next,v.next=null,l.lastBaseUpdate=v,l.shared.pending=null}}while(!0);if(y===null&&(a=w),l.baseState=a,l.firstBaseUpdate=m,l.lastBaseUpdate=y,t=l.shared.interleaved,t!==null){l=t;do i|=l.lane,l=l.next;while(l!==t)}else o===null&&(l.shared.lanes=0);kn|=i,e.lanes=i,e.memoizedState=w}}function ku(e,t,n){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var r=e[t],l=r.callback;if(l!==null){if(r.callback=null,r=n,typeof l!="function")throw Error(p(191,l));l.call(r)}}}function pn(e){if(e===Rr)throw Error(p(174));return e}function wo(e,t){switch(A(Wr,t),A($r,e),A(ct,Rr),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:nr(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=nr(t,e)}O(ct),A(ct,t)}function On(e){O(ct),O($r),O(Wr)}function Eu(e){pn(Wr.current);var t=pn(ct.current),n=nr(t,e.type);t!==n&&(A($r,e),A(ct,n))}function xo(e){$r.current===e&&(O(ct),O($r))}function sl(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||n.data==="$?"||n.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}function So(){for(var e=0;e<Fi.length;e++)Fi[e]._workInProgressVersionPrimary=null;Fi.length=0}function we(){throw Error(p(321))}function ko(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!Je(e[n],t[n]))return!1;return!0}function Eo(e,t,n,r,l,o){if(Sn=o,X=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,Vl.current=e===null||e.memoizedState===null?bc:qc,e=n(r,l),Vr){o=0;do{if(Vr=!1,Hr=0,25<=o)throw Error(p(301));o+=1,ce=ue=null,t.updateQueue=null,Vl.current=ed,e=n(r,l)}while(Vr)}if(Vl.current=Al,t=ue!==null&&ue.next!==null,Sn=0,ce=ue=X=null,Hl=!1,t)throw Error(p(300));return e}function Co(){var e=Hr!==0;return Hr=0,e}function it(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return ce===null?X.memoizedState=ce=e:ce=ce.next=e,ce}function We(){if(ue===null){var e=X.alternate;e=e!==null?e.memoizedState:null}else e=ue.next;var t=ce===null?X.memoizedState:ce.next;if(t!==null)ce=t,ue=e;else{if(e===null)throw Error(p(310));ue=e,e={memoizedState:ue.memoizedState,baseState:ue.baseState,baseQueue:ue.baseQueue,queue:ue.queue,next:null},ce===null?X.memoizedState=ce=e:ce=ce.next=e}return ce}function vr(e,t){return typeof t=="function"?t(e):t}function No(e,t,n){if(t=We(),n=t.queue,n===null)throw Error(p(311));n.lastRenderedReducer=e;var r=ue,l=r.baseQueue,o=n.pending;if(o!==null){if(l!==null){var i=l.next;l.next=o.next,o.next=i}r.baseQueue=l=o,n.pending=null}if(l!==null){o=l.next,r=r.baseState;var u=i=null,a=null,m=o;do{var y=m.lane;if((Sn&y)===y)a!==null&&(a=a.next={lane:0,action:m.action,hasEagerState:m.hasEagerState,eagerState:m.eagerState,next:null}),r=m.hasEagerState?m.eagerState:e(r,m.action);else{var w={lane:y,action:m.action,hasEagerState:m.hasEagerState,eagerState:m.eagerState,next:null};a===null?(u=a=w,i=r):a=a.next=w,X.lanes|=y,kn|=y}m=m.next}while(m!==null&&m!==o);a===null?i=r:a.next=u,Je(r,t.memoizedState)||(De=!0),t.memoizedState=r,t.baseState=i,t.baseQueue=a,n.lastRenderedState=r}if(e=n.interleaved,e!==null){l=e;do o=l.lane,X.lanes|=o,kn|=o,l=l.next;while(l!==e)}else l===null&&(n.lanes=0);return[t.memoizedState,n.dispatch]}function _o(e,t,n){if(t=We(),n=t.queue,n===null)throw Error(p(311));n.lastRenderedReducer=e;var r=n.dispatch,l=n.pending,o=t.memoizedState;if(l!==null){n.pending=null;var i=l=l.next;do o=e(o,i.action),i=i.next;while(i!==l);Je(o,t.memoizedState)||(De=!0),t.memoizedState=o,t.baseQueue===null&&(t.baseState=o),n.lastRenderedState=o}return[o,r]}function Cu(e,t,n){}function Nu(e,t,n){n=X;var r=We(),l=t(),o=!Je(r.memoizedState,l);if(o&&(r.memoizedState=l,De=!0),r=r.queue,zo(Pu.bind(null,n,r,e),[e]),r.getSnapshot!==t||o||ce!==null&&ce.memoizedState.tag&1){if(n.flags|=2048,yr(9,zu.bind(null,n,r,l,t),void 0,null),de===null)throw Error(p(349));Sn&30||_u(n,t,l)}return l}function _u(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function zu(e,t,n,r){t.value=n,t.getSnapshot=r,Tu(t)&&Lu(e)}function Pu(e,t,n){return n(function(){Tu(t)&&Lu(e)})}function Tu(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!Je(e,n)}catch{return!0}}function Lu(e){var t=St(e,1);t!==null&&Ke(t,e,1,-1)}function Mu(e){var t=it();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:vr,lastRenderedState:e},t.queue=e,e=e.dispatch=Oa.bind(null,X,e),[t.memoizedState,e]}function yr(e,t,n,r){return e={tag:e,create:t,destroy:n,deps:r,next:null},t=X.updateQueue,t===null?(t={lastEffect:null,stores:null},X.updateQueue=t,t.lastEffect=e.next=e):(n=t.lastEffect,n===null?t.lastEffect=e.next=e:(r=n.next,n.next=e,e.next=r,t.lastEffect=e)),e}function Du(e){return We().memoizedState}function al(e,t,n,r){var l=it();X.flags|=e,l.memoizedState=yr(1|t,n,void 0,r===void 0?null:r)}function cl(e,t,n,r){var l=We();r=r===void 0?null:r;var o=void 0;if(ue!==null){var i=ue.memoizedState;if(o=i.destroy,r!==null&&ko(r,i.deps)){l.memoizedState=yr(t,n,o,r);return}}X.flags|=e,l.memoizedState=yr(1|t,n,o,r)}function Fu(e,t){return al(8390656,8,e,t)}function zo(e,t){return cl(2048,8,e,t)}function Iu(e,t){return cl(4,2,e,t)}function ju(e,t){return cl(4,4,e,t)}function Uu(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function Ou(e,t,n){return n=n!=null?n.concat([e]):null,cl(4,4,Uu.bind(null,t,e),n)}function Po(e,t){}function Ru(e,t){var n=We();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&ko(t,r[1])?r[0]:(n.memoizedState=[e,t],e)}function $u(e,t){var n=We();t=t===void 0?null:t;var r=n.memoizedState;return r!==null&&t!==null&&ko(t,r[1])?r[0]:(e=e(),n.memoizedState=[e,t],e)}function Wu(e,t,n){return Sn&21?(Je(n,t)||(n=ar(),X.lanes|=n,kn|=n,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,De=!0),e.memoizedState=n)}function ja(e,t,n){n=R,R=n!==0&&4>n?n:4,e(!0);var r=Ii.transition;Ii.transition={};try{e(!1),t()}finally{R=n,Ii.transition=r}}function Vu(){return We().memoizedState}function Ua(e,t,n){var r=Qt(e);if(n={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null},Hu(e))Au(t,n);else if(n=wu(e,t,n,r),n!==null){var l=Ne();Ke(n,e,r,l),Bu(n,t,r)}}function Oa(e,t,n){var r=Qt(e),l={lane:r,action:n,hasEagerState:!1,eagerState:null,next:null};if(Hu(e))Au(t,l);else{var o=e.alternate;if(e.lanes===0&&(o===null||o.lanes===0)&&(o=t.lastRenderedReducer,o!==null))try{var i=t.lastRenderedState,u=o(i,n);if(l.hasEagerState=!0,l.eagerState=u,Je(u,i)){var a=t.interleaved;a===null?(l.next=l,vo(t)):(l.next=a.next,a.next=l),t.interleaved=l;return}}catch{}finally{}n=wu(e,t,l,r),n!==null&&(l=Ne(),Ke(n,e,r,l),Bu(n,t,r))}}function Hu(e){var t=e.alternate;return e===X||t!==null&&t===X}function Au(e,t){Vr=Hl=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function Bu(e,t,n){if(n&4194240){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,yt(e,n)}}function Qe(e,t){if(e&&e.defaultProps){t=Y({},t),e=e.defaultProps;for(var n in e)t[n]===void 0&&(t[n]=e[n]);return t}return t}function To(e,t,n,r){t=e.memoizedState,n=n(r,t),n=n==null?t:Y({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}function Qu(e,t,n,r,l,o,i){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(r,o,i):t.prototype&&t.prototype.isPureReactComponent?!fr(n,r)||!fr(l,o):!0}function Yu(e,t,n){var r=!1,l=en,o=t.contextType;return typeof o=="object"&&o!==null?o=$e(o):(l=Te(t)?yn:ie.current,r=t.contextTypes,o=(r=r!=null)?In(e,l):en),t=new t(n,o),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=Bl,e.stateNode=t,t._reactInternals=e,r&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=l,e.__reactInternalMemoizedMaskedChildContext=o),t}function Ku(e,t,n,r){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(n,r),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(n,r),t.state!==e&&Bl.enqueueReplaceState(t,t.state,null)}function Lo(e,t,n,r){var l=e.stateNode;l.props=n,l.state=e.memoizedState,l.refs={},yo(e);var o=t.contextType;typeof o=="object"&&o!==null?l.context=$e(o):(o=Te(t)?yn:ie.current,l.context=In(e,o)),l.state=e.memoizedState,o=t.getDerivedStateFromProps,typeof o=="function"&&(To(e,t,o,n),l.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof l.getSnapshotBeforeUpdate=="function"||typeof l.UNSAFE_componentWillMount!="function"&&typeof l.componentWillMount!="function"||(t=l.state,typeof l.componentWillMount=="function"&&l.componentWillMount(),typeof l.UNSAFE_componentWillMount=="function"&&l.UNSAFE_componentWillMount(),t!==l.state&&Bl.enqueueReplaceState(l,l.state,null),ul(e,n,l,r),l.state=e.memoizedState),typeof l.componentDidMount=="function"&&(e.flags|=4194308)}function Rn(e,t){try{var n="",r=t;do n+=ft(r),r=r.return;while(r);var l=n}catch(o){l=`
Error generating stack: `+o.message+`
`+o.stack}return{value:e,source:t,stack:l,digest:null}}function Mo(e,t,n){return{value:e,source:null,stack:n??null,digest:t??null}}function Do(e,t){try{console.error(t.value)}catch(n){setTimeout(function(){throw n})}}function Xu(e,t,n){n=kt(-1,n),n.tag=3,n.payload={element:null};var r=t.value;return n.callback=function(){Xl||(Xl=!0,Wi=r),Do(e,t)},n}function Gu(e,t,n){n=kt(-1,n),n.tag=3;var r=e.type.getDerivedStateFromError;if(typeof r=="function"){var l=t.value;n.payload=function(){return r(l)},n.callback=function(){Do(e,t)}}var o=e.stateNode;return o!==null&&typeof o.componentDidCatch=="function"&&(n.callback=function(){Do(e,t),typeof r!="function"&&(nn===null?nn=new Set([this]):nn.add(this));var i=t.stack;this.componentDidCatch(t.value,{componentStack:i!==null?i:""})}),n}function Ju(e,t,n){var r=e.pingCache;if(r===null){r=e.pingCache=new td;var l=new Set;r.set(t,l)}else l=r.get(t),l===void 0&&(l=new Set,r.set(t,l));l.has(n)||(l.add(n),e=Xa.bind(null,e,t,n),t.then(e,e))}function Zu(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function bu(e,t,n,r,l){return e.mode&1?(e.flags|=65536,e.lanes=l,e):(e===t?e.flags|=65536:(e.flags|=128,n.flags|=131072,n.flags&=-52805,n.tag===1&&(n.alternate===null?n.tag=17:(t=kt(-1,1),t.tag=2,At(n,t,1))),n.lanes|=1),e)}function Ce(e,t,n,r){t.child=e===null?ca(t,null,n,r):er(t,e.child,n,r)}function qu(e,t,n,r,l){n=n.render;var o=t.ref;return Un(t,l),r=Eo(e,t,n,r,o,l),n=Co(),e!==null&&!De?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,Et(e,t,l)):(Q&&n&&so(t),t.flags|=1,Ce(e,t,r,l),t.child)}function es(e,t,n,r,l){if(e===null){var o=n.type;return typeof o=="function"&&!Yo(o)&&o.defaultProps===void 0&&n.compare===null&&n.defaultProps===void 0?(t.tag=15,t.type=o,ts(e,t,o,r,l)):(e=hl(n.type,null,r,t,t.mode,l),e.ref=t.ref,e.return=t,t.child=e)}if(o=e.child,!(e.lanes&l)){var i=o.memoizedProps;if(n=n.compare,n=n!==null?n:fr,n(i,r)&&e.ref===t.ref)return Et(e,t,l)}return t.flags|=1,e=Kt(o,r),e.ref=t.ref,e.return=t,t.child=e}function ts(e,t,n,r,l){if(e!==null){var o=e.memoizedProps;if(fr(o,r)&&e.ref===t.ref)if(De=!1,t.pendingProps=r=o,(e.lanes&l)!==0)e.flags&131072&&(De=!0);else return t.lanes=e.lanes,Et(e,t,l)}return Fo(e,t,n,r,l)}function ns(e,t,n){var r=t.pendingProps,l=r.children,o=e!==null?e.memoizedState:null;if(r.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},A(dt,ze),ze|=n;else{if(!(n&1073741824))return e=o!==null?o.baseLanes|n:n,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,A(dt,ze),ze|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},r=o!==null?o.baseLanes:n,A(dt,ze),ze|=r}else o!==null?(r=o.baseLanes|n,t.memoizedState=null):r=n,A(dt,ze),ze|=r;return Ce(e,t,l,n),t.child}function rs(e,t){var n=t.ref;(e===null&&n!==null||e!==null&&e.ref!==n)&&(t.flags|=512,t.flags|=2097152)}function Fo(e,t,n,r,l){var o=Te(n)?yn:ie.current;return o=In(t,o),Un(t,l),n=Eo(e,t,n,r,o,l),r=Co(),e!==null&&!De?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~l,Et(e,t,l)):(Q&&r&&so(t),t.flags|=1,Ce(e,t,n,l),t.child)}function ls(e,t,n,r,l){if(Te(n)){var o=!0;rl(t)}else o=!1;if(Un(t,l),t.stateNode===null)fl(e,t),Yu(t,n,r),Lo(t,n,r,l),r=!0;else if(e===null){var i=t.stateNode,u=t.memoizedProps;i.props=u;var a=i.context,m=n.contextType;typeof m=="object"&&m!==null?m=$e(m):(m=Te(n)?yn:ie.current,m=In(t,m));var y=n.getDerivedStateFromProps,w=typeof y=="function"||typeof i.getSnapshotBeforeUpdate=="function";w||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(u!==r||a!==m)&&Ku(t,i,r,m),tn=!1;var v=t.memoizedState;i.state=v,ul(t,r,i,l),a=t.memoizedState,u!==r||v!==a||he.current||tn?(typeof y=="function"&&(To(t,n,y,r),a=t.memoizedState),(u=tn||Qu(t,n,u,r,v,a,m))?(w||typeof i.UNSAFE_componentWillMount!="function"&&typeof i.componentWillMount!="function"||(typeof i.componentWillMount=="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount=="function"&&i.UNSAFE_componentWillMount()),typeof i.componentDidMount=="function"&&(t.flags|=4194308)):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=r,t.memoizedState=a),i.props=r,i.state=a,i.context=m,r=u):(typeof i.componentDidMount=="function"&&(t.flags|=4194308),r=!1)}else{i=t.stateNode,xu(e,t),u=t.memoizedProps,m=t.type===t.elementType?u:Qe(t.type,u),i.props=m,w=t.pendingProps,v=i.context,a=n.contextType,typeof a=="object"&&a!==null?a=$e(a):(a=Te(n)?yn:ie.current,a=In(t,a));var E=n.getDerivedStateFromProps;(y=typeof E=="function"||typeof i.getSnapshotBeforeUpdate=="function")||typeof i.UNSAFE_componentWillReceiveProps!="function"&&typeof i.componentWillReceiveProps!="function"||(u!==w||v!==a)&&Ku(t,i,r,a),tn=!1,v=t.memoizedState,i.state=v,ul(t,r,i,l);var N=t.memoizedState;u!==w||v!==N||he.current||tn?(typeof E=="function"&&(To(t,n,E,r),N=t.memoizedState),(m=tn||Qu(t,n,m,r,v,N,a)||!1)?(y||typeof i.UNSAFE_componentWillUpdate!="function"&&typeof i.componentWillUpdate!="function"||(typeof i.componentWillUpdate=="function"&&i.componentWillUpdate(r,N,a),typeof i.UNSAFE_componentWillUpdate=="function"&&i.UNSAFE_componentWillUpdate(r,N,a)),typeof i.componentDidUpdate=="function"&&(t.flags|=4),typeof i.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof i.componentDidUpdate!="function"||u===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||u===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),t.memoizedProps=r,t.memoizedState=N),i.props=r,i.state=N,i.context=a,r=m):(typeof i.componentDidUpdate!="function"||u===e.memoizedProps&&v===e.memoizedState||(t.flags|=4),typeof i.getSnapshotBeforeUpdate!="function"||u===e.memoizedProps&&v===e.memoizedState||(t.flags|=1024),r=!1)}return Io(e,t,n,r,o,l)}function Io(e,t,n,r,l,o){rs(e,t);var i=(t.flags&128)!==0;if(!r&&!i)return l&&du(t,n,!1),Et(e,t,o);r=t.stateNode,nd.current=t;var u=i&&typeof n.getDerivedStateFromError!="function"?null:r.render();return t.flags|=1,e!==null&&i?(t.child=er(t,e.child,null,o),t.child=er(t,null,u,o)):Ce(e,t,u,o),t.memoizedState=r.state,l&&du(t,n,!0),t.child}function os(e){var t=e.stateNode;t.pendingContext?au(e,t.pendingContext,t.pendingContext!==t.context):t.context&&au(e,t.context,!1),wo(e,t.containerInfo)}function is(e,t,n,r,l){return jn(),po(l),t.flags|=256,Ce(e,t,n,r),t.child}function jo(e){return{baseLanes:e,cachePool:null,transitions:null}}function us(e,t,n){var r=t.pendingProps,l=K.current,o=!1,i=(t.flags&128)!==0,u;if((u=i)||(u=e!==null&&e.memoizedState===null?!1:(l&2)!==0),u?(o=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(l|=1),A(K,l&1),e===null)return fo(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(i=r.children,e=r.fallback,o?(r=t.mode,o=t.child,i={mode:"hidden",children:i},!(r&1)&&o!==null?(o.childLanes=0,o.pendingProps=i):o=gl(i,r,0,null),e=vn(e,r,n,null),o.return=t,e.return=t,o.sibling=e,t.child=o,t.child.memoizedState=jo(n),t.memoizedState=ji,e):Uo(t,i));if(l=e.memoizedState,l!==null&&(u=l.dehydrated,u!==null))return Ra(e,t,i,r,u,l,n);if(o){o=r.fallback,i=t.mode,l=e.child,u=l.sibling;var a={mode:"hidden",children:r.children};return!(i&1)&&t.child!==l?(r=t.child,r.childLanes=0,r.pendingProps=a,t.deletions=null):(r=Kt(l,a),r.subtreeFlags=l.subtreeFlags&14680064),u!==null?o=Kt(u,o):(o=vn(o,i,n,null),o.flags|=2),o.return=t,r.return=t,r.sibling=o,t.child=r,r=o,o=t.child,i=e.child.memoizedState,i=i===null?jo(n):{baseLanes:i.baseLanes|n,cachePool:null,transitions:i.transitions},o.memoizedState=i,o.childLanes=e.childLanes&~n,t.memoizedState=ji,r}return o=e.child,e=o.sibling,r=Kt(o,{mode:"visible",children:r.children}),!(t.mode&1)&&(r.lanes=n),r.return=t,r.sibling=null,e!==null&&(n=t.deletions,n===null?(t.deletions=[e],t.flags|=16):n.push(e)),t.child=r,t.memoizedState=null,r}function Uo(e,t,n){return t=gl({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function dl(e,t,n,r){return r!==null&&po(r),er(t,e.child,null,n),e=Uo(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Ra(e,t,n,r,l,o,i){if(n)return t.flags&256?(t.flags&=-257,r=Mo(Error(p(422))),dl(e,t,i,r)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(o=r.fallback,l=t.mode,r=gl({mode:"visible",children:r.children},l,0,null),o=vn(o,l,i,null),o.flags|=2,r.return=t,o.return=t,r.sibling=o,t.child=r,t.mode&1&&er(t,e.child,null,i),t.child.memoizedState=jo(i),t.memoizedState=ji,o);if(!(t.mode&1))return dl(e,t,i,null);if(l.data==="$!"){if(r=l.nextSibling&&l.nextSibling.dataset,r)var u=r.dgst;return r=u,o=Error(p(419)),r=Mo(o,r,void 0),dl(e,t,i,r)}if(u=(i&e.childLanes)!==0,De||u){if(r=de,r!==null){switch(i&-i){case 4:l=2;break;case 16:l=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:l=32;break;case 536870912:l=268435456;break;default:l=0}l=l&(r.suspendedLanes|i)?0:l,l!==0&&l!==o.retryLane&&(o.retryLane=l,St(e,l),Ke(r,e,l,-1))}return Qo(),r=Mo(Error(p(421))),dl(e,t,i,r)}return l.data==="$?"?(t.flags|=128,t.child=e.child,t=Ga.bind(null,e),l._reactRetry=t,null):(e=o.treeContext,Me=xt(l.nextSibling),Oe=t,Q=!0,Ze=null,e!==null&&(Ve[He++]=Pt,Ve[He++]=Tt,Ve[He++]=wn,Pt=e.id,Tt=e.overflow,wn=t),t=Uo(t,r.children),t.flags|=4096,t)}function ss(e,t,n){e.lanes|=t;var r=e.alternate;r!==null&&(r.lanes|=t),go(e.return,t,n)}function Oo(e,t,n,r,l){var o=e.memoizedState;o===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:l}:(o.isBackwards=t,o.rendering=null,o.renderingStartTime=0,o.last=r,o.tail=n,o.tailMode=l)}function as(e,t,n){var r=t.pendingProps,l=r.revealOrder,o=r.tail;if(Ce(e,t,r.children,n),r=K.current,r&2)r=r&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&ss(e,n,t);else if(e.tag===19)ss(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}r&=1}if(A(K,r),!(t.mode&1))t.memoizedState=null;else switch(l){case"forwards":for(n=t.child,l=null;n!==null;)e=n.alternate,e!==null&&sl(e)===null&&(l=n),n=n.sibling;n=l,n===null?(l=t.child,t.child=null):(l=n.sibling,n.sibling=null),Oo(t,!1,l,n,o);break;case"backwards":for(n=null,l=t.child,t.child=null;l!==null;){if(e=l.alternate,e!==null&&sl(e)===null){t.child=l;break}e=l.sibling,l.sibling=n,n=l,l=e}Oo(t,!0,n,null,o);break;case"together":Oo(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function fl(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function Et(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),kn|=t.lanes,!(n&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(p(153));if(t.child!==null){for(e=t.child,n=Kt(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=Kt(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function $a(e,t,n){switch(t.tag){case 3:os(t),jn();break;case 5:Eu(t);break;case 1:Te(t.type)&&rl(t);break;case 4:wo(t,t.stateNode.containerInfo);break;case 10:var r=t.type._context,l=t.memoizedProps.value;A($l,r._currentValue),r._currentValue=l;break;case 13:if(r=t.memoizedState,r!==null)return r.dehydrated!==null?(A(K,K.current&1),t.flags|=128,null):n&t.child.childLanes?us(e,t,n):(A(K,K.current&1),e=Et(e,t,n),e!==null?e.sibling:null);A(K,K.current&1);break;case 19:if(r=(n&t.childLanes)!==0,e.flags&128){if(r)return as(e,t,n);t.flags|=128}if(l=t.memoizedState,l!==null&&(l.rendering=null,l.tail=null,l.lastEffect=null),A(K,K.current),r)break;return null;case 22:case 23:return t.lanes=0,ns(e,t,n)}return Et(e,t,n)}function wr(e,t){if(!Q)switch(e.tailMode){case"hidden":t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case"collapsed":n=e.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:r.sibling=null}}function xe(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,r=0;if(t)for(var l=e.child;l!==null;)n|=l.lanes|l.childLanes,r|=l.subtreeFlags&14680064,r|=l.flags&14680064,l.return=e,l=l.sibling;else for(l=e.child;l!==null;)n|=l.lanes|l.childLanes,r|=l.subtreeFlags,r|=l.flags,l.return=e,l=l.sibling;return e.subtreeFlags|=r,e.childLanes=n,t}function Wa(e,t,n){var r=t.pendingProps;switch(ao(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return xe(t),null;case 1:return Te(t.type)&&(O(he),O(ie)),xe(t),null;case 3:return r=t.stateNode,On(),O(he),O(ie),So(),r.pendingContext&&(r.context=r.pendingContext,r.pendingContext=null),(e===null||e.child===null)&&(ll(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,Ze!==null&&(Ao(Ze),Ze=null))),da(e,t),xe(t),null;case 5:xo(t);var l=pn(Wr.current);if(n=t.type,e!==null&&t.stateNode!=null)ld(e,t,n,r,l),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!r){if(t.stateNode===null)throw Error(p(166));return xe(t),null}if(e=pn(ct.current),ll(t)){r=t.stateNode,n=t.type;var o=t.memoizedProps;switch(r[at]=t,r[Or]=o,e=(t.mode&1)!==0,n){case"dialog":B("cancel",r),B("close",r);break;case"iframe":case"object":case"embed":B("load",r);break;case"video":case"audio":for(l=0;l<Ur.length;l++)B(Ur[l],r);break;case"source":B("error",r);break;case"img":case"image":case"link":B("error",r),B("load",r);break;case"details":B("toggle",r);break;case"input":un(r,o),B("invalid",r);break;case"select":r._wrapperState={wasMultiple:!!o.multiple},B("invalid",r);break;case"textarea":mt(r,o),B("invalid",r)}Cn(n,o),l=null;for(var i in o)if(o.hasOwnProperty(i)){var u=o[i];i==="children"?typeof u=="string"?r.textContent!==u&&(o.suppressHydrationWarning!==!0&&el(r.textContent,u,e),l=["children",u]):typeof u=="number"&&r.textContent!==""+u&&(o.suppressHydrationWarning!==!0&&el(r.textContent,u,e),l=["children",""+u]):kr.hasOwnProperty(i)&&u!=null&&i==="onScroll"&&B("scroll",r)}switch(n){case"input":et(r),sn(r,o,!0);break;case"textarea":et(r),rt(r);break;case"select":case"option":break;default:typeof o.onClick=="function"&&(r.onclick=tl)}r=l,t.updateQueue=r,r!==null&&(t.flags|=4)}else{i=l.nodeType===9?l:l.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=En(n)),e==="http://www.w3.org/1999/xhtml"?n==="script"?(e=i.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof r.is=="string"?e=i.createElement(n,{is:r.is}):(e=i.createElement(n),n==="select"&&(i=e,r.multiple?i.multiple=!0:r.size&&(i.size=r.size))):e=i.createElementNS(e,n),e[at]=t,e[Or]=r,rd(e,t,!1,!1),t.stateNode=e;e:{switch(i=Nn(n,r),n){case"dialog":B("cancel",e),B("close",e),l=r;break;case"iframe":case"object":case"embed":B("load",e),l=r;break;case"video":case"audio":for(l=0;l<Ur.length;l++)B(Ur[l],e);l=r;break;case"source":B("error",e),l=r;break;case"img":case"image":case"link":B("error",e),B("load",e),l=r;break;case"details":B("toggle",e),l=r;break;case"input":un(e,r),l=pt(e,r),B("invalid",e);break;case"option":l=r;break;case"select":e._wrapperState={wasMultiple:!!r.multiple},l=Y({},r,{value:void 0}),B("invalid",e);break;case"textarea":mt(e,r),l=ne(e,r),B("invalid",e);break;default:l=r}Cn(n,l),u=l;for(o in u)if(u.hasOwnProperty(o)){var a=u[o];o==="style"?lr(e,a):o==="dangerouslySetInnerHTML"?(a=a?a.__html:void 0,a!=null&&Ws(e,a)):o==="children"?typeof a=="string"?(n!=="textarea"||a!=="")&&Cr(e,a):typeof a=="number"&&Cr(e,""+a):o!=="suppressContentEditableWarning"&&o!=="suppressHydrationWarning"&&o!=="autoFocus"&&(kr.hasOwnProperty(o)?a!=null&&o==="onScroll"&&B("scroll",e):a!=null&&qe(e,o,a,i))}switch(n){case"input":et(e),sn(e,r,!1);break;case"textarea":et(e),rt(e);break;case"option":r.value!=null&&e.setAttribute("value",""+ye(r.value));break;case"select":e.multiple=!!r.multiple,o=r.value,o!=null?le(e,!!r.multiple,o,!1):r.defaultValue!=null&&le(e,!!r.multiple,r.defaultValue,!0);break;default:typeof l.onClick=="function"&&(e.onclick=tl)}switch(n){case"button":case"input":case"select":case"textarea":r=!!r.autoFocus;break e;case"img":r=!0;break e;default:r=!1}}r&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return xe(t),null;case 6:if(e&&t.stateNode!=null)od(e,t,e.memoizedProps,r);else{if(typeof r!="string"&&t.stateNode===null)throw Error(p(166));if(n=pn(Wr.current),pn(ct.current),ll(t)){if(r=t.stateNode,n=t.memoizedProps,r[at]=t,(o=r.nodeValue!==n)&&(e=Oe,e!==null))switch(e.tag){case 3:el(r.nodeValue,n,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&el(r.nodeValue,n,(e.mode&1)!==0)}o&&(t.flags|=4)}else r=(n.nodeType===9?n:n.ownerDocument).createTextNode(r),r[at]=t,t.stateNode=r}return xe(t),null;case 13:if(O(K),r=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(Q&&Me!==null&&t.mode&1&&!(t.flags&128)){for(o=Me;o;)o=xt(o.nextSibling);jn(),t.flags|=98560,o=!1}else if(o=ll(t),r!==null&&r.dehydrated!==null){if(e===null){if(!o)throw Error(p(318));if(o=t.memoizedState,o=o!==null?o.dehydrated:null,!o)throw Error(p(317));o[at]=t}else jn(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;xe(t),o=!1}else Ze!==null&&(Ao(Ze),Ze=null),o=!0;if(!o)return t.flags&65536?t:null}return t.flags&128?(t.lanes=n,t):(r=r!==null,r!==(e!==null&&e.memoizedState!==null)&&r&&(t.child.flags|=8192,t.mode&1&&(e===null||K.current&1?se===0&&(se=3):Qo())),t.updateQueue!==null&&(t.flags|=4),xe(t),null);case 4:return On(),da(e,t),e===null&&pr(t.stateNode.containerInfo),xe(t),null;case 10:return ho(t.type._context),xe(t),null;case 17:return Te(t.type)&&(O(he),O(ie)),xe(t),null;case 19:if(O(K),o=t.memoizedState,o===null)return xe(t),null;if(r=(t.flags&128)!==0,i=o.rendering,i===null)if(r)wr(o,!1);else{if(se!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(i=sl(e),i!==null){for(t.flags|=128,wr(o,!1),r=i.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),t.subtreeFlags=0,r=n,n=t.child;n!==null;)o=n,e=r,o.flags&=14680066,i=o.alternate,i===null?(o.childLanes=0,o.lanes=e,o.child=null,o.subtreeFlags=0,o.memoizedProps=null,o.memoizedState=null,o.updateQueue=null,o.dependencies=null,o.stateNode=null):(o.childLanes=i.childLanes,o.lanes=i.lanes,o.child=i.child,o.subtreeFlags=0,o.deletions=null,o.memoizedProps=i.memoizedProps,o.memoizedState=i.memoizedState,o.updateQueue=i.updateQueue,o.type=i.type,e=i.dependencies,o.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),n=n.sibling;return A(K,K.current&1|2),t.child}e=e.sibling}o.tail!==null&&ae()>$i&&(t.flags|=128,r=!0,wr(o,!1),t.lanes=4194304)}else{if(!r)if(e=sl(i),e!==null){if(t.flags|=128,r=!0,n=e.updateQueue,n!==null&&(t.updateQueue=n,t.flags|=4),wr(o,!0),o.tail===null&&o.tailMode==="hidden"&&!i.alternate&&!Q)return xe(t),null}else 2*ae()-o.renderingStartTime>$i&&n!==1073741824&&(t.flags|=128,r=!0,wr(o,!1),t.lanes=4194304);o.isBackwards?(i.sibling=t.child,t.child=i):(n=o.last,n!==null?n.sibling=i:t.child=i,o.last=i)}return o.tail!==null?(t=o.tail,o.rendering=t,o.tail=t.sibling,o.renderingStartTime=ae(),t.sibling=null,n=K.current,A(K,r?n&1|2:n&1),t):(xe(t),null);case 22:case 23:return ze=dt.current,O(dt),r=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==r&&(t.flags|=8192),r&&t.mode&1?ze&1073741824&&(xe(t),t.subtreeFlags&6&&(t.flags|=8192)):xe(t),null;case 24:return null;case 25:return null}throw Error(p(156,t.tag))}function Va(e,t,n){switch(ao(t),t.tag){case 1:return Te(t.type)&&(O(he),O(ie)),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return On(),O(he),O(ie),So(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return xo(t),null;case 13:if(O(K),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(p(340));jn()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return O(K),null;case 4:return On(),null;case 10:return ho(t.type._context),null;case 22:case 23:return ze=dt.current,O(dt),null;case 24:return null;default:return null}}function $n(e,t){var n=e.ref;if(n!==null)if(typeof n=="function")try{n(null)}catch(r){Z(e,t,r)}else n.current=null}function Ro(e,t,n){try{n()}catch(r){Z(e,t,r)}}function Ha(e,t){if(_i=Ml,e=tu(),ro(e)){if("selectionStart"in e)var n={start:e.selectionStart,end:e.selectionEnd};else e:{n=(n=e.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var l=r.anchorOffset,o=r.focusNode;r=r.focusOffset;try{n.nodeType,o.nodeType}catch{n=null;break e}var i=0,u=-1,a=-1,m=0,y=0,w=e,v=null;t:for(;;){for(var E;w!==n||l!==0&&w.nodeType!==3||(u=i+l),w!==o||r!==0&&w.nodeType!==3||(a=i+r),w.nodeType===3&&(i+=w.nodeValue.length),(E=w.firstChild)!==null;)v=w,w=E;for(;;){if(w===e)break t;if(v===n&&++m===l&&(u=i),v===o&&++y===r&&(a=i),(E=w.nextSibling)!==null)break;w=v,v=w.parentNode}w=E}n=u===-1||a===-1?null:{start:u,end:a}}else n=null}n=n||{start:0,end:0}}else n=null;for(zi={focusedElem:e,selectionRange:n},Ml=!1,C=t;C!==null;)if(t=C,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,C=e;else for(;C!==null;){t=C;try{var N=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(N!==null){var _=N.memoizedProps,ee=N.memoizedState,d=t.stateNode,c=d.getSnapshotBeforeUpdate(t.elementType===t.type?_:Qe(t.type,_),ee);d.__reactInternalSnapshotBeforeUpdate=c}break;case 3:var f=t.stateNode.containerInfo;f.nodeType===1?f.textContent="":f.nodeType===9&&f.documentElement&&f.removeChild(f.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(p(163))}}catch(x){Z(t,t.return,x)}if(e=t.sibling,e!==null){e.return=t.return,C=e;break}C=t.return}return N=fa,fa=!1,N}function xr(e,t,n){var r=t.updateQueue;if(r=r!==null?r.lastEffect:null,r!==null){var l=r=r.next;do{if((l.tag&e)===e){var o=l.destroy;l.destroy=void 0,o!==void 0&&Ro(t,n,o)}l=l.next}while(l!==r)}}function pl(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var n=t=t.next;do{if((n.tag&e)===e){var r=n.create;n.destroy=r()}n=n.next}while(n!==t)}}function $o(e){var t=e.ref;if(t!==null){var n=e.stateNode;switch(e.tag){case 5:e=n;break;default:e=n}typeof t=="function"?t(e):t.current=e}}function cs(e){var t=e.alternate;t!==null&&(e.alternate=null,cs(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[at],delete t[Or],delete t[Ti],delete t[Kc],delete t[Xc])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function ds(e){return e.tag===5||e.tag===3||e.tag===4}function fs(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||ds(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Wo(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.nodeType===8?n.parentNode.insertBefore(e,t):n.insertBefore(e,t):(n.nodeType===8?(t=n.parentNode,t.insertBefore(e,n)):(t=n,t.appendChild(e)),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=tl));else if(r!==4&&(e=e.child,e!==null))for(Wo(e,t,n),e=e.sibling;e!==null;)Wo(e,t,n),e=e.sibling}function Vo(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(r!==4&&(e=e.child,e!==null))for(Vo(e,t,n),e=e.sibling;e!==null;)Vo(e,t,n),e=e.sibling}function Bt(e,t,n){for(n=n.child;n!==null;)ps(e,t,n),n=n.sibling}function ps(e,t,n){if(st&&typeof st.onCommitFiberUnmount=="function")try{st.onCommitFiberUnmount(zl,n)}catch{}switch(n.tag){case 5:Se||$n(n,t);case 6:var r=ge,l=be;ge=null,Bt(e,t,n),ge=r,be=l,ge!==null&&(be?(e=ge,n=n.stateNode,e.nodeType===8?e.parentNode.removeChild(n):e.removeChild(n)):ge.removeChild(n.stateNode));break;case 18:ge!==null&&(be?(e=ge,n=n.stateNode,e.nodeType===8?uo(e.parentNode,n):e.nodeType===1&&uo(e,n),D(e)):uo(ge,n.stateNode));break;case 4:r=ge,l=be,ge=n.stateNode.containerInfo,be=!0,Bt(e,t,n),ge=r,be=l;break;case 0:case 11:case 14:case 15:if(!Se&&(r=n.updateQueue,r!==null&&(r=r.lastEffect,r!==null))){l=r=r.next;do{var o=l,i=o.destroy;o=o.tag,i!==void 0&&(o&2||o&4)&&Ro(n,t,i),l=l.next}while(l!==r)}Bt(e,t,n);break;case 1:if(!Se&&($n(n,t),r=n.stateNode,typeof r.componentWillUnmount=="function"))try{r.props=n.memoizedProps,r.state=n.memoizedState,r.componentWillUnmount()}catch(u){Z(n,t,u)}Bt(e,t,n);break;case 21:Bt(e,t,n);break;case 22:n.mode&1?(Se=(r=Se)||n.memoizedState!==null,Bt(e,t,n),Se=r):Bt(e,t,n);break;default:Bt(e,t,n)}}function ms(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var n=e.stateNode;n===null&&(n=e.stateNode=new id),t.forEach(function(r){var l=Ja.bind(null,e,r);n.has(r)||(n.add(r),r.then(l,l))})}}function Ye(e,t,n){if(n=t.deletions,n!==null)for(var r=0;r<n.length;r++){var l=n[r];try{var o=e,i=t,u=i;e:for(;u!==null;){switch(u.tag){case 5:ge=u.stateNode,be=!1;break e;case 3:ge=u.stateNode.containerInfo,be=!0;break e;case 4:ge=u.stateNode.containerInfo,be=!0;break e}u=u.return}if(ge===null)throw Error(p(160));ps(o,i,l),ge=null,be=!1;var a=l.alternate;a!==null&&(a.return=null),l.return=null}catch(m){Z(l,t,m)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)hs(t,e),t=t.sibling}function hs(e,t,n){var r=e.alternate;switch(n=e.flags,e.tag){case 0:case 11:case 14:case 15:if(Ye(t,e),ut(e),n&4){try{xr(3,e,e.return),pl(3,e)}catch(_){Z(e,e.return,_)}try{xr(5,e,e.return)}catch(_){Z(e,e.return,_)}}break;case 1:Ye(t,e),ut(e),n&512&&r!==null&&$n(r,r.return);break;case 5:if(Ye(t,e),ut(e),n&512&&r!==null&&$n(r,r.return),e.flags&32){var l=e.stateNode;try{Cr(l,"")}catch(_){Z(e,e.return,_)}}if(n&4&&(l=e.stateNode,l!=null)){var o=e.memoizedProps,i=r!==null?r.memoizedProps:o,u=e.type,a=e.updateQueue;if(e.updateQueue=null,a!==null)try{u==="input"&&o.type==="radio"&&o.name!=null&&nt(l,o),Nn(u,i);var m=Nn(u,o);for(i=0;i<a.length;i+=2){var y=a[i],w=a[i+1];y==="style"?lr(l,w):y==="dangerouslySetInnerHTML"?Ws(l,w):y==="children"?Cr(l,w):qe(l,y,w,m)}switch(u){case"input":Rt(l,o);break;case"textarea":an(l,o);break;case"select":var v=l._wrapperState.wasMultiple;l._wrapperState.wasMultiple=!!o.multiple;var E=o.value;E!=null?le(l,!!o.multiple,E,!1):v!==!!o.multiple&&(o.defaultValue!=null?le(l,!!o.multiple,o.defaultValue,!0):le(l,!!o.multiple,o.multiple?[]:"",!1))}l[Or]=o}catch(_){Z(e,e.return,_)}}break;case 6:if(Ye(t,e),ut(e),n&4){if(e.stateNode===null)throw Error(p(162));l=e.stateNode,o=e.memoizedProps;try{l.nodeValue=o}catch(_){Z(e,e.return,_)}}break;case 3:if(Ye(t,e),ut(e),n&4&&r!==null&&r.memoizedState.isDehydrated)try{D(t.containerInfo)}catch(_){Z(e,e.return,_)}break;case 4:Ye(t,e),ut(e);break;case 13:Ye(t,e),ut(e),l=e.child,l.flags&8192&&(o=l.memoizedState!==null,l.stateNode.isHidden=o,!o||l.alternate!==null&&l.alternate.memoizedState!==null||(Ri=ae())),n&4&&ms(e);break;case 22:if(y=r!==null&&r.memoizedState!==null,e.mode&1?(Se=(m=Se)||y,Ye(t,e),Se=m):Ye(t,e),ut(e),n&8192){if(m=e.memoizedState!==null,(e.stateNode.isHidden=m)&&!y&&e.mode&1)for(C=e,y=e.child;y!==null;){for(w=C=y;C!==null;){switch(v=C,E=v.child,v.tag){case 0:case 11:case 14:case 15:xr(4,v,v.return);break;case 1:$n(v,v.return);var N=v.stateNode;if(typeof N.componentWillUnmount=="function"){n=v,t=v.return;try{r=n,N.props=r.memoizedProps,N.state=r.memoizedState,N.componentWillUnmount()}catch(_){Z(n,t,_)}}break;case 5:$n(v,v.return);break;case 22:if(v.memoizedState!==null){ys(w);continue}}E!==null?(E.return=v,C=E):ys(w)}y=y.sibling}e:for(y=null,w=e;;){if(w.tag===5){if(y===null){y=w;try{l=w.stateNode,m?(o=l.style,typeof o.setProperty=="function"?o.setProperty("display","none","important"):o.display="none"):(u=w.stateNode,a=w.memoizedProps.style,i=a!=null&&a.hasOwnProperty("display")?a.display:null,u.style.display=rr("display",i))}catch(_){Z(e,e.return,_)}}}else if(w.tag===6){if(y===null)try{w.stateNode.nodeValue=m?"":w.memoizedProps}catch(_){Z(e,e.return,_)}}else if((w.tag!==22&&w.tag!==23||w.memoizedState===null||w===e)&&w.child!==null){w.child.return=w,w=w.child;continue}if(w===e)break e;for(;w.sibling===null;){if(w.return===null||w.return===e)break e;y===w&&(y=null),w=w.return}y===w&&(y=null),w.sibling.return=w.return,w=w.sibling}}break;case 19:Ye(t,e),ut(e),n&4&&ms(e);break;case 21:break;default:Ye(t,e),ut(e)}}function ut(e){var t=e.flags;if(t&2){try{e:{for(var n=e.return;n!==null;){if(ds(n)){var r=n;break e}n=n.return}throw Error(p(160))}switch(r.tag){case 5:var l=r.stateNode;r.flags&32&&(Cr(l,""),r.flags&=-33);var o=fs(e);Vo(e,o,l);break;case 3:case 4:var i=r.stateNode.containerInfo,u=fs(e);Wo(e,u,i);break;default:throw Error(p(161))}}catch(a){Z(e,e.return,a)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function Aa(e,t,n){C=e,gs(e,t,n)}function gs(e,t,n){for(var r=(e.mode&1)!==0;C!==null;){var l=C,o=l.child;if(l.tag===22&&r){var i=l.memoizedState!==null||Ql;if(!i){var u=l.alternate,a=u!==null&&u.memoizedState!==null||Se;u=Ql;var m=Se;if(Ql=i,(Se=a)&&!m)for(C=l;C!==null;)i=C,a=i.child,i.tag===22&&i.memoizedState!==null?ws(l):a!==null?(a.return=i,C=a):ws(l);for(;o!==null;)C=o,gs(o,t,n),o=o.sibling;C=l,Ql=u,Se=m}vs(e,t,n)}else l.subtreeFlags&8772&&o!==null?(o.return=l,C=o):vs(e,t,n)}}function vs(e,t,n){for(;C!==null;){if(t=C,t.flags&8772){n=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:Se||pl(5,t);break;case 1:var r=t.stateNode;if(t.flags&4&&!Se)if(n===null)r.componentDidMount();else{var l=t.elementType===t.type?n.memoizedProps:Qe(t.type,n.memoizedProps);r.componentDidUpdate(l,n.memoizedState,r.__reactInternalSnapshotBeforeUpdate)}var o=t.updateQueue;o!==null&&ku(t,o,r);break;case 3:var i=t.updateQueue;if(i!==null){if(n=null,t.child!==null)switch(t.child.tag){case 5:n=t.child.stateNode;break;case 1:n=t.child.stateNode}ku(t,i,n)}break;case 5:var u=t.stateNode;if(n===null&&t.flags&4){n=u;var a=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":a.autoFocus&&n.focus();break;case"img":a.src&&(n.src=a.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var m=t.alternate;if(m!==null){var y=m.memoizedState;if(y!==null){var w=y.dehydrated;w!==null&&D(w)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(p(163))}Se||t.flags&512&&$o(t)}catch(v){Z(t,t.return,v)}}if(t===e){C=null;break}if(n=t.sibling,n!==null){n.return=t.return,C=n;break}C=t.return}}function ys(e){for(;C!==null;){var t=C;if(t===e){C=null;break}var n=t.sibling;if(n!==null){n.return=t.return,C=n;break}C=t.return}}function ws(e){for(;C!==null;){var t=C;try{switch(t.tag){case 0:case 11:case 15:var n=t.return;try{pl(4,t)}catch(a){Z(t,n,a)}break;case 1:var r=t.stateNode;if(typeof r.componentDidMount=="function"){var l=t.return;try{r.componentDidMount()}catch(a){Z(t,l,a)}}var o=t.return;try{$o(t)}catch(a){Z(t,o,a)}break;case 5:var i=t.return;try{$o(t)}catch(a){Z(t,i,a)}}}catch(a){Z(t,t.return,a)}if(t===e){C=null;break}var u=t.sibling;if(u!==null){u.return=t.return,C=u;break}C=t.return}}function Sr(){$i=ae()+500}function Ne(){return I&6?ae():Zl!==-1?Zl:Zl=ae()}function Qt(e){return e.mode&1?I&2&&ve!==0?ve&-ve:Gc.transition!==null?(bl===0&&(bl=ar()),bl):(e=R,e!==0||(e=window.event,e=e===void 0?16:oe(e.type)),e):1}function Ke(e,t,n,r){if(50<Qr)throw Qr=0,Vi=null,Error(p(185));ot(e,n,r),(!(I&2)||e!==de)&&(e===de&&(!(I&2)&&(Kl|=n),se===4&&Yt(e,ve)),Le(e,r),n===1&&I===0&&!(t.mode&1)&&(Sr(),Ul&&Ht()))}function Le(e,t){var n=e.callbackNode;cn(e,t);var r=gt(e,e===de?ve:0);if(r===0)n!==null&&Ys(n),e.callbackNode=null,e.callbackPriority=0;else if(t=r&-r,e.callbackPriority!==t){if(n!=null&&Ys(n),t===1)e.tag===0?Ia(Ss.bind(null,e)):fu(Ss.bind(null,e)),Yc(function(){!(I&6)&&Ht()}),n=null;else{switch(cr(r)){case 1:n=hi;break;case 4:n=Ks;break;case 16:n=_l;break;case 536870912:n=Xs;break;default:n=_l}n=Ps(n,xs.bind(null,e))}e.callbackPriority=t,e.callbackNode=n}}function xs(e,t){if(Zl=-1,bl=0,I&6)throw Error(p(327));var n=e.callbackNode;if(Wn()&&e.callbackNode!==n)return null;var r=gt(e,e===de?ve:0);if(r===0)return null;if(r&30||r&e.expiredLanes||t)t=ml(e,r);else{t=r;var l=I;I|=2;var o=Es();(de!==e||ve!==t)&&(Lt=null,Sr(),hn(e,t));do try{Ya();break}catch(u){ks(e,u)}while(!0);mo(),Yl.current=o,I=l,re!==null?t=0:(de=null,ve=0,t=se)}if(t!==0){if(t===2&&(l=Pn(e),l!==0&&(r=l,t=Ho(e,l))),t===1)throw n=Ar,hn(e,0),Yt(e,r),Le(e,ae()),n;if(t===6)Yt(e,r);else{if(l=e.current.alternate,!(r&30)&&!Ba(l)&&(t=ml(e,r),t===2&&(o=Pn(e),o!==0&&(r=o,t=Ho(e,o))),t===1))throw n=Ar,hn(e,0),Yt(e,r),Le(e,ae()),n;switch(e.finishedWork=l,e.finishedLanes=r,t){case 0:case 1:throw Error(p(345));case 2:gn(e,Fe,Lt);break;case 3:if(Yt(e,r),(r&130023424)===r&&(t=Ri+500-ae(),10<t)){if(gt(e,0)!==0)break;if(l=e.suspendedLanes,(l&r)!==r){Ne(),e.pingedLanes|=e.suspendedLanes&l;break}e.timeoutHandle=Pi(gn.bind(null,e,Fe,Lt),t);break}gn(e,Fe,Lt);break;case 4:if(Yt(e,r),(r&4194240)===r)break;for(t=e.eventTimes,l=-1;0<r;){var i=31-Ge(r);o=1<<i,i=t[i],i>l&&(l=i),r&=~o}if(r=l,r=ae()-r,r=(120>r?120:480>r?480:1080>r?1080:1920>r?1920:3e3>r?3e3:4320>r?4320:1960*ud(r/1960))-r,10<r){e.timeoutHandle=Pi(gn.bind(null,e,Fe,Lt),r);break}gn(e,Fe,Lt);break;case 5:gn(e,Fe,Lt);break;default:throw Error(p(329))}}}return Le(e,ae()),e.callbackNode===n?xs.bind(null,e):null}function Ho(e,t){var n=Br;return e.current.memoizedState.isDehydrated&&(hn(e,t).flags|=256),e=ml(e,t),e!==2&&(t=Fe,Fe=n,t!==null&&Ao(t)),e}function Ao(e){Fe===null?Fe=e:Fe.push.apply(Fe,e)}function Ba(e){for(var t=e;;){if(t.flags&16384){var n=t.updateQueue;if(n!==null&&(n=n.stores,n!==null))for(var r=0;r<n.length;r++){var l=n[r],o=l.getSnapshot;l=l.value;try{if(!Je(o(),l))return!1}catch{return!1}}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function Yt(e,t){for(t&=~Oi,t&=~Kl,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var n=31-Ge(t),r=1<<n;e[n]=-1,t&=~r}}function Ss(e){if(I&6)throw Error(p(327));Wn();var t=gt(e,0);if(!(t&1))return Le(e,ae()),null;var n=ml(e,t);if(e.tag!==0&&n===2){var r=Pn(e);r!==0&&(t=r,n=Ho(e,r))}if(n===1)throw n=Ar,hn(e,0),Yt(e,t),Le(e,ae()),n;if(n===6)throw Error(p(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,gn(e,Fe,Lt),Le(e,ae()),null}function Bo(e,t){var n=I;I|=1;try{return e(t)}finally{I=n,I===0&&(Sr(),Ul&&Ht())}}function mn(e){rn!==null&&rn.tag===0&&!(I&6)&&Wn();var t=I;I|=1;var n=_e.transition,r=R;try{if(_e.transition=null,R=1,e)return e()}finally{R=r,_e.transition=n,I=t,!(I&6)&&Ht()}}function hn(e,t){e.finishedWork=null,e.finishedLanes=0;var n=e.timeoutHandle;if(n!==-1&&(e.timeoutHandle=-1,Qc(n)),re!==null)for(n=re.return;n!==null;){var r=n;switch(ao(r),r.tag){case 1:r=r.type.childContextTypes,r!=null&&(O(he),O(ie));break;case 3:On(),O(he),O(ie),So();break;case 5:xo(r);break;case 4:On();break;case 13:O(K);break;case 19:O(K);break;case 10:ho(r.type._context);break;case 22:case 23:ze=dt.current,O(dt)}n=n.return}if(de=e,re=e=Kt(e.current,null),ve=ze=t,se=0,Ar=null,Oi=Kl=kn=0,Fe=Br=null,xn!==null){for(t=0;t<xn.length;t++)if(n=xn[t],r=n.interleaved,r!==null){n.interleaved=null;var l=r.next,o=n.pending;if(o!==null){var i=o.next;o.next=l,r.next=i}n.pending=r}xn=null}return e}function ks(e,t){do{var n=re;try{if(mo(),Vl.current=Al,Hl){for(var r=X.memoizedState;r!==null;){var l=r.queue;l!==null&&(l.pending=null),r=r.next}Hl=!1}if(Sn=0,ce=ue=X=null,Vr=!1,Hr=0,Ui.current=null,n===null||n.return===null){se=1,Ar=t,re=null;break}e:{var o=e,i=n.return,u=n,a=t;if(t=ve,u.flags|=32768,a!==null&&typeof a=="object"&&typeof a.then=="function"){var m=a,y=u,w=y.tag;if(!(y.mode&1)&&(w===0||w===11||w===15)){var v=y.alternate;v?(y.updateQueue=v.updateQueue,y.memoizedState=v.memoizedState,y.lanes=v.lanes):(y.updateQueue=null,y.memoizedState=null)}var E=Zu(i);if(E!==null){E.flags&=-257,bu(E,i,u,o,t),E.mode&1&&Ju(o,m,t),t=E,a=m;var N=t.updateQueue;if(N===null){var _=new Set;_.add(a),t.updateQueue=_}else N.add(a);break e}else{if(!(t&1)){Ju(o,m,t),Qo();break e}a=Error(p(426))}}else if(Q&&u.mode&1){var ee=Zu(i);if(ee!==null){!(ee.flags&65536)&&(ee.flags|=256),bu(ee,i,u,o,t),po(Rn(a,u));break e}}o=a=Rn(a,u),se!==4&&(se=2),Br===null?Br=[o]:Br.push(o),o=i;do{switch(o.tag){case 3:o.flags|=65536,t&=-t,o.lanes|=t;var d=Xu(o,a,t);Su(o,d);break e;case 1:u=a;var c=o.type,f=o.stateNode;if(!(o.flags&128)&&(typeof c.getDerivedStateFromError=="function"||f!==null&&typeof f.componentDidCatch=="function"&&(nn===null||!nn.has(f)))){o.flags|=65536,t&=-t,o.lanes|=t;var x=Gu(o,u,t);Su(o,x);break e}}o=o.return}while(o!==null)}Ns(n)}catch(z){t=z,re===n&&n!==null&&(re=n=n.return);continue}break}while(!0)}function Es(){var e=Yl.current;return Yl.current=Al,e===null?Al:e}function Qo(){(se===0||se===3||se===2)&&(se=4),de===null||!(kn&268435455)&&!(Kl&268435455)||Yt(de,ve)}function ml(e,t){var n=I;I|=2;var r=Es();(de!==e||ve!==t)&&(Lt=null,hn(e,t));do try{Qa();break}catch(l){ks(e,l)}while(!0);if(mo(),I=n,Yl.current=r,re!==null)throw Error(p(261));return de=null,ve=0,se}function Qa(){for(;re!==null;)Cs(re)}function Ya(){for(;re!==null&&!ac();)Cs(re)}function Cs(e){var t=sd(e.alternate,e,ze);e.memoizedProps=e.pendingProps,t===null?Ns(e):re=t,Ui.current=null}function Ns(e){var t=e;do{var n=t.alternate;if(e=t.return,t.flags&32768){if(n=Va(n,t),n!==null){n.flags&=32767,re=n;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{se=6,re=null;return}}else if(n=Wa(n,t,ze),n!==null){re=n;return}if(t=t.sibling,t!==null){re=t;return}re=t=e}while(t!==null);se===0&&(se=5)}function gn(e,t,n){var r=R,l=_e.transition;try{_e.transition=null,R=1,Ka(e,t,n,r)}finally{_e.transition=l,R=r}return null}function Ka(e,t,n,r){do Wn();while(rn!==null);if(I&6)throw Error(p(327));n=e.finishedWork;var l=e.finishedLanes;if(n===null)return null;if(e.finishedWork=null,e.finishedLanes=0,n===e.current)throw Error(p(177));e.callbackNode=null,e.callbackPriority=0;var o=n.lanes|n.childLanes;if(Ln(e,o),e===de&&(re=de=null,ve=0),!(n.subtreeFlags&2064)&&!(n.flags&2064)||Gl||(Gl=!0,Ps(_l,function(){return Wn(),null})),o=(n.flags&15990)!==0,n.subtreeFlags&15990||o){o=_e.transition,_e.transition=null;var i=R;R=1;var u=I;I|=4,Ui.current=null,Ha(e,n),hs(n,e),Da(zi),Ml=!!_i,zi=_i=null,e.current=n,Aa(n,e,l),cc(),I=u,R=i,_e.transition=o}else e.current=n;if(Gl&&(Gl=!1,rn=e,Jl=l),o=e.pendingLanes,o===0&&(nn=null),to(n.stateNode,r),Le(e,ae()),t!==null)for(r=e.onRecoverableError,n=0;n<t.length;n++)l=t[n],r(l.value,{componentStack:l.stack,digest:l.digest});if(Xl)throw Xl=!1,e=Wi,Wi=null,e;return Jl&1&&e.tag!==0&&Wn(),o=e.pendingLanes,o&1?e===Vi?Qr++:(Qr=0,Vi=e):Qr=0,Ht(),null}function Wn(){if(rn!==null){var e=cr(Jl),t=_e.transition,n=R;try{if(_e.transition=null,R=16>e?16:e,rn===null)var r=!1;else{if(e=rn,rn=null,Jl=0,I&6)throw Error(p(331));var l=I;for(I|=4,C=e.current;C!==null;){var o=C,i=o.child;if(C.flags&16){var u=o.deletions;if(u!==null){for(var a=0;a<u.length;a++){var m=u[a];for(C=m;C!==null;){var y=C;switch(y.tag){case 0:case 11:case 15:xr(8,y,o)}var w=y.child;if(w!==null)w.return=y,C=w;else for(;C!==null;){y=C;var v=y.sibling,E=y.return;if(cs(y),y===m){C=null;break}if(v!==null){v.return=E,C=v;break}C=E}}}var N=o.alternate;if(N!==null){var _=N.child;if(_!==null){N.child=null;do{var ee=_.sibling;_.sibling=null,_=ee}while(_!==null)}}C=o}}if(o.subtreeFlags&2064&&i!==null)i.return=o,C=i;else e:for(;C!==null;){if(o=C,o.flags&2048)switch(o.tag){case 0:case 11:case 15:xr(9,o,o.return)}var d=o.sibling;if(d!==null){d.return=o.return,C=d;break e}C=o.return}}var c=e.current;for(C=c;C!==null;){i=C;var f=i.child;if(i.subtreeFlags&2064&&f!==null)f.return=i,C=f;else e:for(i=c;C!==null;){if(u=C,u.flags&2048)try{switch(u.tag){case 0:case 11:case 15:pl(9,u)}}catch(z){Z(u,u.return,z)}if(u===i){C=null;break e}var x=u.sibling;if(x!==null){x.return=u.return,C=x;break e}C=u.return}}if(I=l,Ht(),st&&typeof st.onPostCommitFiberRoot=="function")try{st.onPostCommitFiberRoot(zl,e)}catch{}r=!0}return r}finally{R=n,_e.transition=t}}return!1}function _s(e,t,n){t=Rn(n,t),t=Xu(e,t,1),e=At(e,t,1),t=Ne(),e!==null&&(ot(e,1,t),Le(e,t))}function Z(e,t,n){if(e.tag===3)_s(e,e,n);else for(;t!==null;){if(t.tag===3){_s(t,e,n);break}else if(t.tag===1){var r=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof r.componentDidCatch=="function"&&(nn===null||!nn.has(r))){e=Rn(n,e),e=Gu(t,e,1),t=At(t,e,1),e=Ne(),t!==null&&(ot(t,1,e),Le(t,e));break}}t=t.return}}function Xa(e,t,n){var r=e.pingCache;r!==null&&r.delete(t),t=Ne(),e.pingedLanes|=e.suspendedLanes&n,de===e&&(ve&n)===n&&(se===4||se===3&&(ve&130023424)===ve&&500>ae()-Ri?hn(e,0):Oi|=n),Le(e,t)}function zs(e,t){t===0&&(e.mode&1?(t=Tl,Tl<<=1,!(Tl&130023424)&&(Tl=4194304)):t=1);var n=Ne();e=St(e,t),e!==null&&(ot(e,t,n),Le(e,n))}function Ga(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),zs(e,n)}function Ja(e,t){var n=0;switch(e.tag){case 13:var r=e.stateNode,l=e.memoizedState;l!==null&&(n=l.retryLane);break;case 19:r=e.stateNode;break;default:throw Error(p(314))}r!==null&&r.delete(t),zs(e,n)}function Ps(e,t){return Qs(e,t)}function Za(e,t,n,r){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Yo(e){return e=e.prototype,!(!e||!e.isReactComponent)}function ba(e){if(typeof e=="function")return Yo(e)?1:0;if(e!=null){if(e=e.$$typeof,e===li)return 11;if(e===ui)return 14}return 2}function Kt(e,t){var n=e.alternate;return n===null?(n=Ae(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&14680064,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n}function hl(e,t,n,r,l,o){var i=2;if(r=e,typeof e=="function")Yo(e)&&(i=1);else if(typeof e=="string")i=5;else e:switch(e){case Hn:return vn(n.children,l,o,t);case ni:i=8,l|=8;break;case ri:return e=Ae(12,n,t,l|2),e.elementType=ri,e.lanes=o,e;case oi:return e=Ae(13,n,t,l),e.elementType=oi,e.lanes=o,e;case ii:return e=Ae(19,n,t,l),e.elementType=ii,e.lanes=o,e;case Rs:return gl(n,l,o,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case Us:i=10;break e;case Os:i=9;break e;case li:i=11;break e;case ui:i=14;break e;case Xt:i=16,r=null;break e}throw Error(p(130,e==null?e:typeof e,""))}return t=Ae(i,n,t,l),t.elementType=e,t.type=r,t.lanes=o,t}function vn(e,t,n,r){return e=Ae(7,e,r,t),e.lanes=n,e}function gl(e,t,n,r){return e=Ae(22,e,r,t),e.elementType=Rs,e.lanes=n,e.stateNode={isHidden:!1},e}function Ko(e,t,n){return e=Ae(6,e,null,t),e.lanes=n,e}function Xo(e,t,n){return t=Ae(4,e.children!==null?e.children:[],e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function qa(e,t,n,r,l){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Tn(0),this.expirationTimes=Tn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Tn(0),this.identifierPrefix=r,this.onRecoverableError=l,this.mutableSourceEagerHydrationData=null}function Go(e,t,n,r,l,o,i,u,a,m){return e=new qa(e,t,n,u,a),t===1?(t=1,o===!0&&(t|=8)):t=0,o=Ae(3,null,null,t),e.current=o,o.stateNode=e,o.memoizedState={element:r,isDehydrated:n,cache:null,transitions:null,pendingSuspenseBoundaries:null},yo(o),e}function ec(e,t,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Vn,key:r==null?null:""+r,children:e,containerInfo:t,implementation:n}}function Ts(e){if(!e)return en;e=e._reactInternals;e:{if(ht(e)!==e||e.tag!==1)throw Error(p(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(Te(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(p(171))}if(e.tag===1){var n=e.type;if(Te(n))return cu(e,n,t)}return t}function Ls(e,t,n,r,l,o,i,u,a,m){return e=Go(n,r,!0,e,l,o,i,u,a),e.context=Ts(null),n=e.current,r=Ne(),l=Qt(n),o=kt(r,l),o.callback=t??null,At(n,o,l),e.current.lanes=l,ot(e,l,r),Le(e,r),e}function vl(e,t,n,r){var l=t.current,o=Ne(),i=Qt(l);return n=Ts(n),t.context===null?t.context=n:t.pendingContext=n,t=kt(o,i),t.payload={element:e},r=r===void 0?null:r,r!==null&&(t.callback=r),e=At(l,t,i),e!==null&&(Ke(e,l,i,o),il(e,l,i)),i}function yl(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function Ms(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function Jo(e,t){Ms(e,t),(e=e.alternate)&&Ms(e,t)}function tc(e){return e=je(e),e===null?null:e.stateNode}function nc(e){return null}function Zo(e){this._internalRoot=e}function wl(e){this._internalRoot=e}function bo(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function xl(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function Ds(){}function rc(e,t,n,r,l){if(l){if(typeof r=="function"){var o=r;r=function(){var m=yl(i);o.call(m)}}var i=Ls(t,r,e,0,null,!1,!1,"",Ds);return e._reactRootContainer=i,e[_t]=i.current,pr(e.nodeType===8?e.parentNode:e),mn(),i}for(;l=e.lastChild;)e.removeChild(l);if(typeof r=="function"){var u=r;r=function(){var m=yl(a);u.call(m)}}var a=Go(e,0,!1,null,null,!1,!1,"",Ds);return e._reactRootContainer=a,e[_t]=a.current,pr(e.nodeType===8?e.parentNode:e),mn(function(){vl(t,a,n,r)}),a}function Sl(e,t,n,r,l){var o=n._reactRootContainer;if(o){var i=o;if(typeof l=="function"){var u=l;l=function(){var a=yl(i);u.call(a)}}vl(t,i,e,l)}else i=rc(n,t,e,l,r);return yl(i)}var Fs=new Set,kr={},Ct=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),qo=Object.prototype.hasOwnProperty,lc=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,Is={},js={},me={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){me[e]=new G(e,0,!1,e,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];me[t]=new G(t,1,!1,e[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(e){me[e]=new G(e,2,!1,e.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){me[e]=new G(e,2,!1,e,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){me[e]=new G(e,3,!1,e.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(e){me[e]=new G(e,3,!0,e,null,!1,!1)}),["capture","download"].forEach(function(e){me[e]=new G(e,4,!1,e,null,!1,!1)}),["cols","rows","size","span"].forEach(function(e){me[e]=new G(e,6,!1,e,null,!1,!1)}),["rowSpan","start"].forEach(function(e){me[e]=new G(e,5,!1,e.toLowerCase(),null,!1,!1)});var ei=/[\-:]([a-z])/g,ti=function(e){return e[1].toUpperCase()};"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(ei,ti);me[t]=new G(t,1,!1,e,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(ei,ti);me[t]=new G(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(ei,ti);me[t]=new G(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(e){me[e]=new G(e,1,!1,e.toLowerCase(),null,!1,!1)}),me.xlinkHref=new G("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(e){me[e]=new G(e,1,!1,e.toLowerCase(),null,!0,!0)});var Nt=j.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,kl=Symbol.for("react.element"),Vn=Symbol.for("react.portal"),Hn=Symbol.for("react.fragment"),ni=Symbol.for("react.strict_mode"),ri=Symbol.for("react.profiler"),Us=Symbol.for("react.provider"),Os=Symbol.for("react.context"),li=Symbol.for("react.forward_ref"),oi=Symbol.for("react.suspense"),ii=Symbol.for("react.suspense_list"),ui=Symbol.for("react.memo"),Xt=Symbol.for("react.lazy");Symbol.for("react.scope"),Symbol.for("react.debug_trace_mode");var Rs=Symbol.for("react.offscreen");Symbol.for("react.legacy_hidden"),Symbol.for("react.cache"),Symbol.for("react.tracing_marker");var $s=Symbol.iterator,Y=Object.assign,si,ai=!1,Er=Array.isArray,El,Ws=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,n,r,l){MSApp.execUnsafeLocalFunction(function(){return e(t,n,r,l)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(El=El||document.createElement("div"),El.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=El.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}}),Cr=function(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t},Nr={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},oc=["Webkit","ms","Moz","O"];Object.keys(Nr).forEach(function(e){oc.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Nr[t]=Nr[e]})});var ic=Y({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0}),ci=null,di=null,An=null,Bn=null,Vs=function(e,t){return e(t)},Hs=function(){},fi=!1,pi=!1;if(Ct)try{var _r={};Object.defineProperty(_r,"passive",{get:function(){pi=!0}}),window.addEventListener("test",_r,_r),window.removeEventListener("test",_r,_r)}catch{pi=!1}var uc=function(e,t,n,r,l,o,i,u,a){var m=Array.prototype.slice.call(arguments,3);try{t.apply(n,m)}catch(y){this.onError(y)}},zr=!1,Cl=null,Nl=!1,mi=null,sc={onError:function(e){zr=!0,Cl=e}},Xe=j.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.Scheduler,As=Xe.unstable_scheduleCallback,Bs=Xe.unstable_NormalPriority,Qs=As,Ys=Xe.unstable_cancelCallback,ac=Xe.unstable_shouldYield,cc=Xe.unstable_requestPaint,ae=Xe.unstable_now,dc=Xe.unstable_getCurrentPriorityLevel,hi=Xe.unstable_ImmediatePriority,Ks=Xe.unstable_UserBlockingPriority,_l=Bs,fc=Xe.unstable_LowPriority,Xs=Xe.unstable_IdlePriority,zl=null,st=null,Ge=Math.clz32?Math.clz32:Pe,pc=Math.log,mc=Math.LN2,Pl=64,Tl=4194304,R=0,gi=!1,Ll=[],Gt=null,Jt=null,Zt=null,Pr=new Map,Tr=new Map,bt=[],hc="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" "),Qn=Nt.ReactCurrentBatchConfig,Ml=!0,Dl=null,qt=null,vi=null,Fl=null,Yn={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},yi=Ue(Yn),Lr=Y({},Yn,{view:0,detail:0}),gc=Ue(Lr),wi,xi,Mr,Il=Y({},Lr,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:no,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Mr&&(Mr&&e.type==="mousemove"?(wi=e.screenX-Mr.screenX,xi=e.screenY-Mr.screenY):xi=wi=0,Mr=e),wi)},movementY:function(e){return"movementY"in e?e.movementY:xi}}),Gs=Ue(Il),vc=Y({},Il,{dataTransfer:0}),yc=Ue(vc),wc=Y({},Lr,{relatedTarget:0}),Si=Ue(wc),xc=Y({},Yn,{animationName:0,elapsedTime:0,pseudoElement:0}),Sc=Ue(xc),kc=Y({},Yn,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Ec=Ue(kc),Cc=Y({},Yn,{data:0}),Js=Ue(Cc),Nc=Js,_c={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},zc={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Pc={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"},Tc=Y({},Lr,{key:function(e){if(e.key){var t=_c[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=Xr(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?zc[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:no,charCode:function(e){return e.type==="keypress"?Xr(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Xr(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Lc=Ue(Tc),Mc=Y({},Il,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Zs=Ue(Mc),Dc=Y({},Lr,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:no}),Fc=Ue(Dc),Ic=Y({},Yn,{propertyName:0,elapsedTime:0,pseudoElement:0}),jc=Ue(Ic),Uc=Y({},Il,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Oc=Ue(Uc),Rc=[9,13,27,32],ki=Ct&&"CompositionEvent"in window,Dr=null;Ct&&"documentMode"in document&&(Dr=document.documentMode);var $c=Ct&&"TextEvent"in window&&!Dr,bs=Ct&&(!ki||Dr&&8<Dr&&11>=Dr),qs=" ",ea=!1,Kn=!1,Wc={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0},Fr=null,Ir=null,ta=!1;Ct&&(ta=Ca("input")&&(!document.documentMode||9<document.documentMode));var Je=typeof Object.is=="function"?Object.is:Ma,Vc=Ct&&"documentMode"in document&&11>=document.documentMode,Xn=null,Ei=null,jr=null,Ci=!1,Gn={animationend:Zr("Animation","AnimationEnd"),animationiteration:Zr("Animation","AnimationIteration"),animationstart:Zr("Animation","AnimationStart"),transitionend:Zr("Transition","TransitionEnd")},Ni={},na={};Ct&&(na=document.createElement("div").style,"AnimationEvent"in window||(delete Gn.animationend.animation,delete Gn.animationiteration.animation,delete Gn.animationstart.animation),"TransitionEvent"in window||delete Gn.transitionend.transition);var ra=br("animationend"),la=br("animationiteration"),oa=br("animationstart"),ia=br("transitionend"),ua=new Map,sa="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");(function(){for(var e=0;e<sa.length;e++){var t=sa[e],n=t.toLowerCase();t=t[0].toUpperCase()+t.slice(1),Wt(n,"on"+t)}Wt(ra,"onAnimationEnd"),Wt(la,"onAnimationIteration"),Wt(oa,"onAnimationStart"),Wt("dblclick","onDoubleClick"),Wt("focusin","onFocus"),Wt("focusout","onBlur"),Wt(ia,"onTransitionEnd")})(),q("onMouseEnter",["mouseout","mouseover"]),q("onMouseLeave",["mouseout","mouseover"]),q("onPointerEnter",["pointerout","pointerover"]),q("onPointerLeave",["pointerout","pointerover"]),b("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),b("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),b("onBeforeInput",["compositionend","keypress","textInput","paste"]),b("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),b("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),b("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Ur="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),Hc=new Set("cancel close invalid load scroll toggle".split(" ").concat(Ur)),jl="_reactListening"+Math.random().toString(36).slice(2),Ac=/\r\n?/g,Bc=/\u0000|\uFFFD/g,_i=null,zi=null,Pi=typeof setTimeout=="function"?setTimeout:void 0,Qc=typeof clearTimeout=="function"?clearTimeout:void 0,aa=typeof Promise=="function"?Promise:void 0,Yc=typeof queueMicrotask=="function"?queueMicrotask:typeof aa<"u"?function(e){return aa.resolve(null).then(e).catch(Fa)}:Pi,Jn=Math.random().toString(36).slice(2),at="__reactFiber$"+Jn,Or="__reactProps$"+Jn,_t="__reactContainer$"+Jn,Ti="__reactEvents$"+Jn,Kc="__reactListeners$"+Jn,Xc="__reactHandles$"+Jn,Li=[],Zn=-1,en={},ie=Vt(en),he=Vt(!1),yn=en,zt=null,Ul=!1,Mi=!1,bn=[],qn=0,Ol=null,Rl=0,Ve=[],He=0,wn=null,Pt=1,Tt="",Oe=null,Me=null,Q=!1,Ze=null,Gc=Nt.ReactCurrentBatchConfig,er=yu(!0),ca=yu(!1),$l=Vt(null),Wl=null,tr=null,Di=null,xn=null,Jc=St,tn=!1,Rr={},ct=Vt(Rr),$r=Vt(Rr),Wr=Vt(Rr),K=Vt(0),Fi=[],Vl=Nt.ReactCurrentDispatcher,Ii=Nt.ReactCurrentBatchConfig,Sn=0,X=null,ue=null,ce=null,Hl=!1,Vr=!1,Hr=0,Zc=0,Al={readContext:$e,useCallback:we,useContext:we,useEffect:we,useImperativeHandle:we,useInsertionEffect:we,useLayoutEffect:we,useMemo:we,useReducer:we,useRef:we,useState:we,useDebugValue:we,useDeferredValue:we,useTransition:we,useMutableSource:we,useSyncExternalStore:we,useId:we,unstable_isNewReconciler:!1},bc={readContext:$e,useCallback:function(e,t){return it().memoizedState=[e,t===void 0?null:t],e},useContext:$e,useEffect:Fu,useImperativeHandle:function(e,t,n){return n=n!=null?n.concat([e]):null,al(4194308,4,Uu.bind(null,t,e),n)},useLayoutEffect:function(e,t){return al(4194308,4,e,t)},useInsertionEffect:function(e,t){return al(4,2,e,t)},useMemo:function(e,t){var n=it();return t=t===void 0?null:t,e=e(),n.memoizedState=[e,t],e},useReducer:function(e,t,n){var r=it();return t=n!==void 0?n(t):t,r.memoizedState=r.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},r.queue=e,e=e.dispatch=Ua.bind(null,X,e),[r.memoizedState,e]},useRef:function(e){var t=it();return e={current:e},t.memoizedState=e},useState:Mu,useDebugValue:Po,useDeferredValue:function(e){return it().memoizedState=e},useTransition:function(){var e=Mu(!1),t=e[0];return e=ja.bind(null,e[1]),it().memoizedState=e,[t,e]},useMutableSource:function(e,t,n){},useSyncExternalStore:function(e,t,n){var r=X,l=it();if(Q){if(n===void 0)throw Error(p(407));n=n()}else{if(n=t(),de===null)throw Error(p(349));Sn&30||_u(r,t,n)}l.memoizedState=n;var o={value:n,getSnapshot:t};return l.queue=o,Fu(Pu.bind(null,r,o,e),[e]),r.flags|=2048,yr(9,zu.bind(null,r,o,n,t),void 0,null),n},useId:function(){var e=it(),t=de.identifierPrefix;if(Q){var n=Tt,r=Pt;n=(r&~(1<<32-Ge(r)-1)).toString(32)+n,t=":"+t+"R"+n,n=Hr++,0<n&&(t+="H"+n.toString(32)),t+=":"}else n=Zc++,t=":"+t+"r"+n.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},qc={readContext:$e,useCallback:Ru,useContext:$e,useEffect:zo,useImperativeHandle:Ou,useInsertionEffect:Iu,useLayoutEffect:ju,useMemo:$u,useReducer:No,useRef:Du,useState:function(e){return No(vr)},useDebugValue:Po,useDeferredValue:function(e){var t=We();return Wu(t,ue.memoizedState,e)},useTransition:function(){var e=No(vr)[0],t=We().memoizedState;return[e,t]},useMutableSource:Cu,useSyncExternalStore:Nu,useId:Vu,unstable_isNewReconciler:!1},ed={readContext:$e,useCallback:Ru,useContext:$e,useEffect:zo,useImperativeHandle:Ou,useInsertionEffect:Iu,useLayoutEffect:ju,useMemo:$u,useReducer:_o,useRef:Du,useState:function(e){return _o(vr)},useDebugValue:Po,useDeferredValue:function(e){var t=We();return ue===null?t.memoizedState=e:Wu(t,ue.memoizedState,e)},useTransition:function(){var e=_o(vr)[0],t=We().memoizedState;return[e,t]},useMutableSource:Cu,useSyncExternalStore:Nu,useId:Vu,unstable_isNewReconciler:!1},Bl={isMounted:function(e){return(e=e._reactInternals)?ht(e)===e:!1},enqueueSetState:function(e,t,n){e=e._reactInternals;var r=Ne(),l=Qt(e),o=kt(r,l);o.payload=t,n!=null&&(o.callback=n),t=At(e,o,l),t!==null&&(Ke(t,e,l,r),il(t,e,l))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var r=Ne(),l=Qt(e),o=kt(r,l);o.tag=1,o.payload=t,n!=null&&(o.callback=n),t=At(e,o,l),t!==null&&(Ke(t,e,l,r),il(t,e,l))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=Ne(),r=Qt(e),l=kt(n,r);l.tag=2,t!=null&&(l.callback=t),t=At(e,l,r),t!==null&&(Ke(t,e,r,n),il(t,e,r))}},td=typeof WeakMap=="function"?WeakMap:Map,nd=Nt.ReactCurrentOwner,De=!1,ji={dehydrated:null,treeContext:null,retryLane:0},rd=function(e,t,n,r){for(n=t.child;n!==null;){if(n.tag===5||n.tag===6)e.appendChild(n.stateNode);else if(n.tag!==4&&n.child!==null){n.child.return=n,n=n.child;continue}if(n===t)break;for(;n.sibling===null;){if(n.return===null||n.return===t)return;n=n.return}n.sibling.return=n.return,n=n.sibling}},da=function(e,t){},ld=function(e,t,n,r,l){var o=e.memoizedProps;if(o!==r){switch(e=t.stateNode,pn(ct.current),l=null,n){case"input":o=pt(e,o),r=pt(e,r),l=[];break;case"select":o=Y({},o,{value:void 0}),r=Y({},r,{value:void 0}),l=[];break;case"textarea":o=ne(e,o),r=ne(e,r),l=[];break;default:typeof o.onClick!="function"&&typeof r.onClick=="function"&&(e.onclick=tl)}Cn(n,r);var i;n=null;for(m in o)if(!r.hasOwnProperty(m)&&o.hasOwnProperty(m)&&o[m]!=null)if(m==="style"){var u=o[m];for(i in u)u.hasOwnProperty(i)&&(n||(n={}),n[i]="")}else m!=="dangerouslySetInnerHTML"&&m!=="children"&&m!=="suppressContentEditableWarning"&&m!=="suppressHydrationWarning"&&m!=="autoFocus"&&(kr.hasOwnProperty(m)?l||(l=[]):(l=l||[]).push(m,null));for(m in r){var a=r[m];if(u=o!=null?o[m]:void 0,r.hasOwnProperty(m)&&a!==u&&(a!=null||u!=null))if(m==="style")if(u){for(i in u)!u.hasOwnProperty(i)||a&&a.hasOwnProperty(i)||(n||(n={}),n[i]="");for(i in a)a.hasOwnProperty(i)&&u[i]!==a[i]&&(n||(n={}),n[i]=a[i])}else n||(l||(l=[]),l.push(m,n)),n=a;else m==="dangerouslySetInnerHTML"?(a=a?a.__html:void 0,u=u?u.__html:void 0,a!=null&&u!==a&&(l=l||[]).push(m,a)):m==="children"?typeof a!="string"&&typeof a!="number"||(l=l||[]).push(m,""+a):m!=="suppressContentEditableWarning"&&m!=="suppressHydrationWarning"&&(kr.hasOwnProperty(m)?(a!=null&&m==="onScroll"&&B("scroll",e),l||u===a||(l=[])):(l=l||[]).push(m,a))}n&&(l=l||[]).push("style",n);var m=l;(t.updateQueue=m)&&(t.flags|=4)}},od=function(e,t,n,r){n!==r&&(t.flags|=4)},Ql=!1,Se=!1,id=typeof WeakSet=="function"?WeakSet:Set,C=null,fa=!1,ge=null,be=!1,ud=Math.ceil,Yl=Nt.ReactCurrentDispatcher,Ui=Nt.ReactCurrentOwner,_e=Nt.ReactCurrentBatchConfig,I=0,de=null,re=null,ve=0,ze=0,dt=Vt(0),se=0,Ar=null,kn=0,Kl=0,Oi=0,Br=null,Fe=null,Ri=0,$i=1/0,Lt=null,Xl=!1,Wi=null,nn=null,Gl=!1,rn=null,Jl=0,Qr=0,Vi=null,Zl=-1,bl=0,sd=function(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps||he.current)De=!0;else{if(!(e.lanes&n)&&!(t.flags&128))return De=!1,$a(e,t,n);De=!!(e.flags&131072)}else De=!1,Q&&t.flags&1048576&&pu(t,Rl,t.index);switch(t.lanes=0,t.tag){case 2:var r=t.type;fl(e,t),e=t.pendingProps;var l=In(t,ie.current);Un(t,n),l=Eo(null,t,r,e,l,n);var o=Co();return t.flags|=1,typeof l=="object"&&l!==null&&typeof l.render=="function"&&l.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,Te(r)?(o=!0,rl(t)):o=!1,t.memoizedState=l.state!==null&&l.state!==void 0?l.state:null,yo(t),l.updater=Bl,t.stateNode=l,l._reactInternals=t,Lo(t,r,e,n),t=Io(null,t,r,!0,o,n)):(t.tag=0,Q&&o&&so(t),Ce(null,t,l,n),t=t.child),t;case 16:r=t.elementType;e:{switch(fl(e,t),e=t.pendingProps,l=r._init,r=l(r._payload),t.type=r,l=t.tag=ba(r),e=Qe(r,e),l){case 0:t=Fo(null,t,r,e,n);break e;case 1:t=ls(null,t,r,e,n);break e;case 11:t=qu(null,t,r,e,n);break e;case 14:t=es(null,t,r,Qe(r.type,e),n);break e}throw Error(p(306,r,""))}return t;case 0:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:Qe(r,l),Fo(e,t,r,l,n);case 1:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:Qe(r,l),ls(e,t,r,l,n);case 3:e:{if(os(t),e===null)throw Error(p(387));r=t.pendingProps,o=t.memoizedState,l=o.element,xu(e,t),ul(t,r,null,n);var i=t.memoizedState;if(r=i.element,o.isDehydrated)if(o={element:r,isDehydrated:!1,cache:i.cache,pendingSuspenseBoundaries:i.pendingSuspenseBoundaries,transitions:i.transitions},t.updateQueue.baseState=o,t.memoizedState=o,t.flags&256){l=Rn(Error(p(423)),t),t=is(e,t,r,n,l);break e}else if(r!==l){l=Rn(Error(p(424)),t),t=is(e,t,r,n,l);break e}else for(Me=xt(t.stateNode.containerInfo.firstChild),Oe=t,Q=!0,Ze=null,n=ca(t,null,r,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling;else{if(jn(),r===l){t=Et(e,t,n);break e}Ce(e,t,r,n)}t=t.child}return t;case 5:return Eu(t),e===null&&fo(t),r=t.type,l=t.pendingProps,o=e!==null?e.memoizedProps:null,i=l.children,io(r,l)?i=null:o!==null&&io(r,o)&&(t.flags|=32),rs(e,t),Ce(e,t,i,n),t.child;case 6:return e===null&&fo(t),null;case 13:return us(e,t,n);case 4:return wo(t,t.stateNode.containerInfo),r=t.pendingProps,e===null?t.child=er(t,null,r,n):Ce(e,t,r,n),t.child;case 11:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:Qe(r,l),qu(e,t,r,l,n);case 7:return Ce(e,t,t.pendingProps,n),t.child;case 8:return Ce(e,t,t.pendingProps.children,n),t.child;case 12:return Ce(e,t,t.pendingProps.children,n),t.child;case 10:e:{if(r=t.type._context,l=t.pendingProps,o=t.memoizedProps,i=l.value,A($l,r._currentValue),r._currentValue=i,o!==null)if(Je(o.value,i)){if(o.children===l.children&&!he.current){t=Et(e,t,n);break e}}else for(o=t.child,o!==null&&(o.return=t);o!==null;){var u=o.dependencies;if(u!==null){i=o.child;for(var a=u.firstContext;a!==null;){if(a.context===r){if(o.tag===1){a=kt(-1,n&-n),a.tag=2;var m=o.updateQueue;if(m!==null){m=m.shared;var y=m.pending;y===null?a.next=a:(a.next=y.next,y.next=a),m.pending=a}}o.lanes|=n,a=o.alternate,a!==null&&(a.lanes|=n),go(o.return,n,t),u.lanes|=n;break}a=a.next}}else if(o.tag===10)i=o.type===t.type?null:o.child;else if(o.tag===18){if(i=o.return,i===null)throw Error(p(341));i.lanes|=n,u=i.alternate,u!==null&&(u.lanes|=n),go(i,n,t),i=o.sibling}else i=o.child;if(i!==null)i.return=o;else for(i=o;i!==null;){if(i===t){i=null;break}if(o=i.sibling,o!==null){o.return=i.return,i=o;break}i=i.return}o=i}Ce(e,t,l.children,n),t=t.child}return t;case 9:return l=t.type,r=t.pendingProps.children,Un(t,n),l=$e(l),r=r(l),t.flags|=1,Ce(e,t,r,n),t.child;case 14:return r=t.type,l=Qe(r,t.pendingProps),l=Qe(r.type,l),es(e,t,r,l,n);case 15:return ts(e,t,t.type,t.pendingProps,n);case 17:return r=t.type,l=t.pendingProps,l=t.elementType===r?l:Qe(r,l),fl(e,t),t.tag=1,Te(r)?(e=!0,rl(t)):e=!1,Un(t,n),Yu(t,r,l),Lo(t,r,l,n),Io(null,t,r,!0,e,n);case 19:return as(e,t,n);case 22:return ns(e,t,n)}throw Error(p(156,t.tag))},Ae=function(e,t,n,r){return new Za(e,t,n,r)},pa=typeof reportError=="function"?reportError:function(e){console.error(e)};wl.prototype.render=Zo.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(p(409));vl(e,t,null,null)},wl.prototype.unmount=Zo.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;mn(function(){vl(null,e,null,null)}),t[_t]=null}},wl.prototype.unstable_scheduleHydration=function(e){if(e){var t=dd();e={blockedOn:null,target:e,priority:t};for(var n=0;n<bt.length&&t!==0&&t<bt[n].priority;n++);bt.splice(n,0,e),n===0&&Kr(e)}};var ad=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var n=J(t.pendingLanes);n!==0&&(yt(t,n|1),Le(t,ae()),!(I&6)&&(Sr(),Ht()))}break;case 13:mn(function(){var r=St(e,1);if(r!==null){var l=Ne();Ke(r,e,1,l)}}),Jo(e,1)}},ma=function(e){if(e.tag===13){var t=St(e,134217728);if(t!==null){var n=Ne();Ke(t,e,134217728,n)}Jo(e,134217728)}},cd=function(e){if(e.tag===13){var t=Qt(e),n=St(e,t);if(n!==null){var r=Ne();Ke(n,e,t,r)}Jo(e,t)}},dd=function(){return R},fd=function(e,t){var n=R;try{return R=e,t()}finally{R=n}};di=function(e,t,n){switch(t){case"input":if(Rt(e,n),t=n.name,n.type==="radio"&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<n.length;t++){var r=n[t];if(r!==e&&r.form===e.form){var l=nl(r);if(!l)throw Error(p(90));Ot(r),Rt(r,l)}}}break;case"textarea":an(e,n);break;case"select":t=n.value,t!=null&&le(e,!!n.multiple,t,!1)}},function(e,t,n){Vs=e,Hs=n}(Bo,function(e,t,n,r,l){var o=R,i=_e.transition;try{return _e.transition=null,R=1,e(t,n,r,l)}finally{R=o,_e.transition=i,I===0&&Sr()}},mn);var pd={usingClientEntryPoint:!1,Events:[hr,Fn,nl,ir,_n,Bo]};(function(e){if(e={bundleType:e.bundleType,version:e.version,rendererPackageName:e.rendererPackageName,rendererConfig:e.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Nt.ReactCurrentDispatcher,findHostInstanceByFiber:tc,findFiberByHostInstance:e.findFiberByHostInstance||nc,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1"},typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u")e=!1;else{var t=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(t.isDisabled||!t.supportsFiber)e=!0;else{try{zl=t.inject(e),st=t}catch{}e=!!t.checkDCE}}return e})({findFiberByHostInstance:dn,bundleType:0,version:"18.3.1-next-f1338f8080-20240426",rendererPackageName:"react-dom"}),S.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=pd,S.createPortal=function(e,t){var n=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!bo(t))throw Error(p(200));return ec(e,t,null,n)},S.createRoot=function(e,t){if(!bo(e))throw Error(p(299));var n=!1,r="",l=pa;return t!=null&&(t.unstable_strictMode===!0&&(n=!0),t.identifierPrefix!==void 0&&(r=t.identifierPrefix),t.onRecoverableError!==void 0&&(l=t.onRecoverableError)),t=Go(e,1,!1,null,null,n,!1,r,l),e[_t]=t.current,pr(e.nodeType===8?e.parentNode:e),new Zo(t)},S.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(p(188)):(e=Object.keys(e).join(","),Error(p(268,e)));return e=je(t),e=e===null?null:e.stateNode,e},S.flushSync=function(e){return mn(e)},S.hydrate=function(e,t,n){if(!xl(t))throw Error(p(200));return Sl(null,e,t,!0,n)},S.hydrateRoot=function(e,t,n){if(!bo(e))throw Error(p(405));var r=n!=null&&n.hydratedSources||null,l=!1,o="",i=pa;if(n!=null&&(n.unstable_strictMode===!0&&(l=!0),n.identifierPrefix!==void 0&&(o=n.identifierPrefix),n.onRecoverableError!==void 0&&(i=n.onRecoverableError)),t=Ls(t,null,e,1,n??null,l,!1,o,i),e[_t]=t.current,pr(e),r)for(e=0;e<r.length;e++)n=r[e],l=n._getVersion,l=l(n._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[n,l]:t.mutableSourceEagerHydrationData.push(n,l);return new wl(t)},S.render=function(e,t,n){if(!xl(t))throw Error(p(200));return Sl(null,e,t,!1,n)},S.unmountComponentAtNode=function(e){if(!xl(e))throw Error(p(40));return e._reactRootContainer?(mn(function(){Sl(null,null,e,!1,function(){e._reactRootContainer=null,e[_t]=null})}),!0):!1},S.unstable_batchedUpdates=Bo,S.unstable_renderSubtreeIntoContainer=function(e,t,n,r){if(!xl(n))throw Error(p(200));if(e==null||e._reactInternals===void 0)throw Error(p(38));return Sl(e,t,n,!1,r)},S.version="18.3.1-next-f1338f8080-20240426"})})();var va=window.ReactDOM;var ya=va.createRoot,{render:Od,hydrate:Rd}=va;ql();(function(){let S=document.createElement("style");S.textContent=`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

*, ::before, ::after{
  --tw-border-spacing-x: 0;
  --tw-border-spacing-y: 0;
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0;
  --tw-skew-x: 0;
  --tw-skew-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
  --tw-pinch-zoom:  ;
  --tw-scroll-snap-strictness: proximity;
  --tw-gradient-from-position:  ;
  --tw-gradient-via-position:  ;
  --tw-gradient-to-position:  ;
  --tw-ordinal:  ;
  --tw-slashed-zero:  ;
  --tw-numeric-figure:  ;
  --tw-numeric-spacing:  ;
  --tw-numeric-fraction:  ;
  --tw-ring-inset:  ;
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  --tw-blur:  ;
  --tw-brightness:  ;
  --tw-contrast:  ;
  --tw-grayscale:  ;
  --tw-hue-rotate:  ;
  --tw-invert:  ;
  --tw-saturate:  ;
  --tw-sepia:  ;
  --tw-drop-shadow:  ;
  --tw-backdrop-blur:  ;
  --tw-backdrop-brightness:  ;
  --tw-backdrop-contrast:  ;
  --tw-backdrop-grayscale:  ;
  --tw-backdrop-hue-rotate:  ;
  --tw-backdrop-invert:  ;
  --tw-backdrop-opacity:  ;
  --tw-backdrop-saturate:  ;
  --tw-backdrop-sepia:  ;
  --tw-contain-size:  ;
  --tw-contain-layout:  ;
  --tw-contain-paint:  ;
  --tw-contain-style:  ;
}

::backdrop{
  --tw-border-spacing-x: 0;
  --tw-border-spacing-y: 0;
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0;
  --tw-skew-x: 0;
  --tw-skew-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
  --tw-pinch-zoom:  ;
  --tw-scroll-snap-strictness: proximity;
  --tw-gradient-from-position:  ;
  --tw-gradient-via-position:  ;
  --tw-gradient-to-position:  ;
  --tw-ordinal:  ;
  --tw-slashed-zero:  ;
  --tw-numeric-figure:  ;
  --tw-numeric-spacing:  ;
  --tw-numeric-fraction:  ;
  --tw-ring-inset:  ;
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  --tw-blur:  ;
  --tw-brightness:  ;
  --tw-contrast:  ;
  --tw-grayscale:  ;
  --tw-hue-rotate:  ;
  --tw-invert:  ;
  --tw-saturate:  ;
  --tw-sepia:  ;
  --tw-drop-shadow:  ;
  --tw-backdrop-blur:  ;
  --tw-backdrop-brightness:  ;
  --tw-backdrop-contrast:  ;
  --tw-backdrop-grayscale:  ;
  --tw-backdrop-hue-rotate:  ;
  --tw-backdrop-invert:  ;
  --tw-backdrop-opacity:  ;
  --tw-backdrop-saturate:  ;
  --tw-backdrop-sepia:  ;
  --tw-contain-size:  ;
  --tw-contain-layout:  ;
  --tw-contain-paint:  ;
  --tw-contain-style:  ;
}

/*
! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com
*/

/*
1. Prevent padding and border from affecting element width. (https://github.com/mozdevs/cssremedy/issues/4)
2. Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)
*/

*,
::before,
::after {
  box-sizing: border-box; /* 1 */
  border-width: 0; /* 2 */
  border-style: solid; /* 2 */
  border-color: #e5e7eb; /* 2 */
}

::before,
::after {
  --tw-content: '';
}

/*
1. Use a consistent sensible line-height in all browsers.
2. Prevent adjustments of font size after orientation changes in iOS.
3. Use a more readable tab size.
4. Use the user's configured \`sans\` font-family by default.
5. Use the user's configured \`sans\` font-feature-settings by default.
6. Use the user's configured \`sans\` font-variation-settings by default.
7. Disable tap highlights on iOS
*/

html,
:host {
  line-height: 1.5; /* 1 */
  -webkit-text-size-adjust: 100%; /* 2 */
  -moz-tab-size: 4; /* 3 */
  -o-tab-size: 4;
     tab-size: 4; /* 3 */
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; /* 4 */
  font-feature-settings: normal; /* 5 */
  font-variation-settings: normal; /* 6 */
  -webkit-tap-highlight-color: transparent; /* 7 */
}

/*
1. Remove the margin in all browsers.
2. Inherit line-height from \`html\` so users can set them as a class directly on the \`html\` element.
*/

body {
  margin: 0; /* 1 */
  line-height: inherit; /* 2 */
}

/*
1. Add the correct height in Firefox.
2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)
3. Ensure horizontal rules are visible by default.
*/

hr {
  height: 0; /* 1 */
  color: inherit; /* 2 */
  border-top-width: 1px; /* 3 */
}

/*
Add the correct text decoration in Chrome, Edge, and Safari.
*/

abbr:where([title]) {
  -webkit-text-decoration: underline dotted;
          text-decoration: underline dotted;
}

/*
Remove the default font size and weight for headings.
*/

h1,
h2,
h3,
h4,
h5,
h6 {
  font-size: inherit;
  font-weight: inherit;
}

/*
Reset links to optimize for opt-in styling instead of opt-out.
*/

a {
  color: inherit;
  text-decoration: inherit;
}

/*
Add the correct font weight in Edge and Safari.
*/

b,
strong {
  font-weight: bolder;
}

/*
1. Use the user's configured \`mono\` font-family by default.
2. Use the user's configured \`mono\` font-feature-settings by default.
3. Use the user's configured \`mono\` font-variation-settings by default.
4. Correct the odd \`em\` font sizing in all browsers.
*/

code,
kbd,
samp,
pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; /* 1 */
  font-feature-settings: normal; /* 2 */
  font-variation-settings: normal; /* 3 */
  font-size: 1em; /* 4 */
}

/*
Add the correct font size in all browsers.
*/

small {
  font-size: 80%;
}

/*
Prevent \`sub\` and \`sup\` elements from affecting the line height in all browsers.
*/

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sub {
  bottom: -0.25em;
}

sup {
  top: -0.5em;
}

/*
1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)
2. Correct table border color inheritance in all Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)
3. Remove gaps between table borders by default.
*/

table {
  text-indent: 0; /* 1 */
  border-color: inherit; /* 2 */
  border-collapse: collapse; /* 3 */
}

/*
1. Change the font styles in all browsers.
2. Remove the margin in Firefox and Safari.
3. Remove default padding in all browsers.
*/

button,
input,
optgroup,
select,
textarea {
  font-family: inherit; /* 1 */
  font-feature-settings: inherit; /* 1 */
  font-variation-settings: inherit; /* 1 */
  font-size: 100%; /* 1 */
  font-weight: inherit; /* 1 */
  line-height: inherit; /* 1 */
  letter-spacing: inherit; /* 1 */
  color: inherit; /* 1 */
  margin: 0; /* 2 */
  padding: 0; /* 3 */
}

/*
Remove the inheritance of text transform in Edge and Firefox.
*/

button,
select {
  text-transform: none;
}

/*
1. Correct the inability to style clickable types in iOS and Safari.
2. Remove default button styles.
*/

button,
input:where([type='button']),
input:where([type='reset']),
input:where([type='submit']) {
  -webkit-appearance: button; /* 1 */
  background-color: transparent; /* 2 */
  background-image: none; /* 2 */
}

/*
Use the modern Firefox focus style for all focusable elements.
*/

:-moz-focusring {
  outline: auto;
}

/*
Remove the additional \`:invalid\` styles in Firefox. (https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737)
*/

:-moz-ui-invalid {
  box-shadow: none;
}

/*
Add the correct vertical alignment in Chrome and Firefox.
*/

progress {
  vertical-align: baseline;
}

/*
Correct the cursor style of increment and decrement buttons in Safari.
*/

::-webkit-inner-spin-button,
::-webkit-outer-spin-button {
  height: auto;
}

/*
1. Correct the odd appearance in Chrome and Safari.
2. Correct the outline style in Safari.
*/

[type='search'] {
  -webkit-appearance: textfield; /* 1 */
  outline-offset: -2px; /* 2 */
}

/*
Remove the inner padding in Chrome and Safari on macOS.
*/

::-webkit-search-decoration {
  -webkit-appearance: none;
}

/*
1. Correct the inability to style clickable types in iOS and Safari.
2. Change font properties to \`inherit\` in Safari.
*/

::-webkit-file-upload-button {
  -webkit-appearance: button; /* 1 */
  font: inherit; /* 2 */
}

/*
Add the correct display in Chrome and Safari.
*/

summary {
  display: list-item;
}

/*
Removes the default spacing and border for appropriate elements.
*/

blockquote,
dl,
dd,
h1,
h2,
h3,
h4,
h5,
h6,
hr,
figure,
p,
pre {
  margin: 0;
}

fieldset {
  margin: 0;
  padding: 0;
}

legend {
  padding: 0;
}

ol,
ul,
menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

/*
Reset default styling for dialogs.
*/

dialog {
  padding: 0;
}

/*
Prevent resizing textareas horizontally by default.
*/

textarea {
  resize: vertical;
}

/*
1. Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)
2. Set the default placeholder color to the user's configured gray 400 color.
*/

input::-moz-placeholder, textarea::-moz-placeholder {
  opacity: 1; /* 1 */
  color: #9ca3af; /* 2 */
}

input::placeholder,
textarea::placeholder {
  opacity: 1; /* 1 */
  color: #9ca3af; /* 2 */
}

/*
Set the default cursor for buttons.
*/

button,
[role="button"] {
  cursor: pointer;
}

/*
Make sure disabled buttons don't get the pointer cursor.
*/

:disabled {
  cursor: default;
}

/*
1. Make replaced elements \`display: block\` by default. (https://github.com/mozdevs/cssremedy/issues/14)
2. Add \`vertical-align: middle\` to align replaced elements more sensibly by default. (https://github.com/jensimmons/cssremedy/issues/14#issuecomment-634934210)
   This can trigger a poorly considered lint error in some tools but is included by design.
*/

img,
svg,
video,
canvas,
audio,
iframe,
embed,
object {
  display: block; /* 1 */
  vertical-align: middle; /* 2 */
}

/*
Constrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)
*/

img,
video {
  max-width: 100%;
  height: auto;
}

/* Make elements with the HTML hidden attribute stay hidden by default */

[hidden]:where(:not([hidden="until-found"])) {
  display: none;
}
.\\!container{
  width: 100% !important;
}
.container{
  width: 100%;
}
@media (min-width: 640px){

  .\\!container{
    max-width: 640px !important;
  }

  .container{
    max-width: 640px;
  }
}
@media (min-width: 768px){

  .\\!container{
    max-width: 768px !important;
  }

  .container{
    max-width: 768px;
  }
}
@media (min-width: 1024px){

  .\\!container{
    max-width: 1024px !important;
  }

  .container{
    max-width: 1024px;
  }
}
@media (min-width: 1280px){

  .\\!container{
    max-width: 1280px !important;
  }

  .container{
    max-width: 1280px;
  }
}
@media (min-width: 1536px){

  .\\!container{
    max-width: 1536px !important;
  }

  .container{
    max-width: 1536px;
  }
}
.fixed{
  position: fixed;
}
.absolute{
  position: absolute;
}
.relative{
  position: relative;
}
.inset-0{
  inset: 0px;
}
.z-10{
  z-index: 10;
}
.mb-1{
  margin-bottom: 0.25rem;
}
.mb-2{
  margin-bottom: 0.5rem;
}
.mb-3{
  margin-bottom: 0.75rem;
}
.mt-1{
  margin-top: 0.25rem;
}
.mt-2{
  margin-top: 0.5rem;
}
.mt-3{
  margin-top: 0.75rem;
}
.mt-6{
  margin-top: 1.5rem;
}
.block{
  display: block;
}
.flex{
  display: flex;
}
.grid{
  display: grid;
}
.contents{
  display: contents;
}
.hidden{
  display: none;
}
.h-2{
  height: 0.5rem;
}
.h-4{
  height: 1rem;
}
.h-48{
  height: 12rem;
}
.h-5{
  height: 1.25rem;
}
.h-8{
  height: 2rem;
}
.h-\\[500px\\]{
  height: 500px;
}
.h-full{
  height: 100%;
}
.max-h-\\[120px\\]{
  max-height: 120px;
}
.max-h-\\[150px\\]{
  max-height: 150px;
}
.w-2{
  width: 0.5rem;
}
.w-4{
  width: 1rem;
}
.w-48{
  width: 12rem;
}
.w-5{
  width: 1.25rem;
}
.w-8{
  width: 2rem;
}
.w-full{
  width: 100%;
}
.min-w-0{
  min-width: 0px;
}
.max-w-\\[280px\\]{
  max-width: 280px;
}
.max-w-\\[80\\%\\]{
  max-width: 80%;
}
.flex-1{
  flex: 1 1 0%;
}
.shrink-0{
  flex-shrink: 0;
}
.-rotate-90{
  --tw-rotate: -90deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.transform{
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}
.grid-cols-2{
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.flex-col{
  flex-direction: column;
}
.items-center{
  align-items: center;
}
.justify-center{
  justify-content: center;
}
.justify-between{
  justify-content: space-between;
}
.gap-1{
  gap: 0.25rem;
}
.gap-2{
  gap: 0.5rem;
}
.gap-3{
  gap: 0.75rem;
}
.gap-4{
  gap: 1rem;
}
.space-y-4 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(1rem * var(--tw-space-y-reverse));
}
.space-y-6 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(1.5rem * var(--tw-space-y-reverse));
}
.space-y-8 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(2rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(2rem * var(--tw-space-y-reverse));
}
.divide-y > :not([hidden]) ~ :not([hidden]){
  --tw-divide-y-reverse: 0;
  border-top-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));
  border-bottom-width: calc(1px * var(--tw-divide-y-reverse));
}
.divide-slate-700\\/50 > :not([hidden]) ~ :not([hidden]){
  border-color: rgb(51 65 85 / 0.5);
}
.overflow-hidden{
  overflow: hidden;
}
.overflow-y-auto{
  overflow-y: auto;
}
.overflow-x-hidden{
  overflow-x: hidden;
}
.truncate{
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rounded{
  border-radius: 0.25rem;
}
.rounded-full{
  border-radius: 9999px;
}
.rounded-lg{
  border-radius: 0.5rem;
}
.rounded-xl{
  border-radius: 0.75rem;
}
.border{
  border-width: 1px;
}
.border-b{
  border-bottom-width: 1px;
}
.border-t{
  border-top-width: 1px;
}
.border-t-2{
  border-top-width: 2px;
}
.border-emerald-400{
  --tw-border-opacity: 1;
  border-color: rgb(52 211 153 / var(--tw-border-opacity, 1));
}
.border-emerald-500\\/30{
  border-color: rgb(16 185 129 / 0.3);
}
.border-slate-600{
  --tw-border-opacity: 1;
  border-color: rgb(71 85 105 / var(--tw-border-opacity, 1));
}
.border-slate-700{
  --tw-border-opacity: 1;
  border-color: rgb(51 65 85 / var(--tw-border-opacity, 1));
}
.border-slate-700\\/50{
  border-color: rgb(51 65 85 / 0.5);
}
.border-slate-800{
  --tw-border-opacity: 1;
  border-color: rgb(30 41 59 / var(--tw-border-opacity, 1));
}
.border-transparent{
  border-color: transparent;
}
.bg-amber-500{
  --tw-bg-opacity: 1;
  background-color: rgb(245 158 11 / var(--tw-bg-opacity, 1));
}
.bg-amber-500\\/10{
  background-color: rgb(245 158 11 / 0.1);
}
.bg-emerald-400{
  --tw-bg-opacity: 1;
  background-color: rgb(52 211 153 / var(--tw-bg-opacity, 1));
}
.bg-emerald-500{
  --tw-bg-opacity: 1;
  background-color: rgb(16 185 129 / var(--tw-bg-opacity, 1));
}
.bg-emerald-500\\/20{
  background-color: rgb(16 185 129 / 0.2);
}
.bg-indigo-500{
  --tw-bg-opacity: 1;
  background-color: rgb(99 102 241 / var(--tw-bg-opacity, 1));
}
.bg-rose-400{
  --tw-bg-opacity: 1;
  background-color: rgb(251 113 133 / var(--tw-bg-opacity, 1));
}
.bg-slate-700{
  --tw-bg-opacity: 1;
  background-color: rgb(51 65 85 / var(--tw-bg-opacity, 1));
}
.bg-slate-800{
  --tw-bg-opacity: 1;
  background-color: rgb(30 41 59 / var(--tw-bg-opacity, 1));
}
.bg-slate-800\\/50{
  background-color: rgb(30 41 59 / 0.5);
}
.bg-slate-900{
  --tw-bg-opacity: 1;
  background-color: rgb(15 23 42 / var(--tw-bg-opacity, 1));
}
.p-1{
  padding: 0.25rem;
}
.p-2{
  padding: 0.5rem;
}
.p-3{
  padding: 0.75rem;
}
.p-4{
  padding: 1rem;
}
.p-5{
  padding: 1.25rem;
}
.px-1{
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}
.px-3{
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}
.px-4{
  padding-left: 1rem;
  padding-right: 1rem;
}
.px-5{
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}
.py-1{
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
.py-2{
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
.py-3{
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}
.py-4{
  padding-top: 1rem;
  padding-bottom: 1rem;
}
.pb-4{
  padding-bottom: 1rem;
}
.pt-5{
  padding-top: 1.25rem;
}
.text-left{
  text-align: left;
}
.text-center{
  text-align: center;
}
.text-right{
  text-align: right;
}
.text-5xl{
  font-size: 3rem;
  line-height: 1;
}
.text-\\[10px\\]{
  font-size: 10px;
}
.text-lg{
  font-size: 1.125rem;
  line-height: 1.75rem;
}
.text-sm{
  font-size: 0.875rem;
  line-height: 1.25rem;
}
.text-xl{
  font-size: 1.25rem;
  line-height: 1.75rem;
}
.text-xs{
  font-size: 0.75rem;
  line-height: 1rem;
}
.font-bold{
  font-weight: 700;
}
.font-medium{
  font-weight: 500;
}
.font-semibold{
  font-weight: 600;
}
.uppercase{
  text-transform: uppercase;
}
.tabular-nums{
  --tw-numeric-spacing: tabular-nums;
  font-variant-numeric: var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction);
}
.tracking-tight{
  letter-spacing: -0.025em;
}
.tracking-tighter{
  letter-spacing: -0.05em;
}
.tracking-wider{
  letter-spacing: 0.05em;
}
.text-amber-400{
  --tw-text-opacity: 1;
  color: rgb(251 191 36 / var(--tw-text-opacity, 1));
}
.text-emerald-300{
  --tw-text-opacity: 1;
  color: rgb(110 231 183 / var(--tw-text-opacity, 1));
}
.text-emerald-400{
  --tw-text-opacity: 1;
  color: rgb(52 211 153 / var(--tw-text-opacity, 1));
}
.text-slate-100{
  --tw-text-opacity: 1;
  color: rgb(241 245 249 / var(--tw-text-opacity, 1));
}
.text-slate-200{
  --tw-text-opacity: 1;
  color: rgb(226 232 240 / var(--tw-text-opacity, 1));
}
.text-slate-300{
  --tw-text-opacity: 1;
  color: rgb(203 213 225 / var(--tw-text-opacity, 1));
}
.text-slate-400{
  --tw-text-opacity: 1;
  color: rgb(148 163 184 / var(--tw-text-opacity, 1));
}
.text-slate-500{
  --tw-text-opacity: 1;
  color: rgb(100 116 139 / var(--tw-text-opacity, 1));
}
.text-white{
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
}
.shadow-lg{
  --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}
.shadow-xl{
  --tw-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}
.shadow-amber-500\\/20{
  --tw-shadow-color: rgb(245 158 11 / 0.2);
  --tw-shadow: var(--tw-shadow-colored);
}
.shadow-emerald-500\\/20{
  --tw-shadow-color: rgb(16 185 129 / 0.2);
  --tw-shadow: var(--tw-shadow-colored);
}
.grayscale{
  --tw-grayscale: grayscale(100%);
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}
.filter{
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}
.transition{
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.transition-all{
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
.duration-1000{
  transition-duration: 1000ms;
}
.ease-linear{
  transition-timing-function: linear;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  width: 400px;
}

body {
  width: 400px;
  max-width: 400px;
  min-height: 500px;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background-color: #0f172a; /* slate-900 */
}

#root {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

/* Custom Scrollbar for a polished feel */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #334155; /* slate-700 */
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #475569; /* slate-600 */
}
.hover\\:bg-amber-600:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(217 119 6 / var(--tw-bg-opacity, 1));
}
.hover\\:bg-emerald-600:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(5 150 105 / var(--tw-bg-opacity, 1));
}
.hover\\:bg-slate-600:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(71 85 105 / var(--tw-bg-opacity, 1));
}
.hover\\:bg-slate-800\\/30:hover{
  background-color: rgb(30 41 59 / 0.3);
}
.hover\\:text-rose-400:hover{
  --tw-text-opacity: 1;
  color: rgb(251 113 133 / var(--tw-text-opacity, 1));
}
.hover\\:text-slate-300:hover{
  --tw-text-opacity: 1;
  color: rgb(203 213 225 / var(--tw-text-opacity, 1));
}
.focus\\:border-emerald-500:focus{
  --tw-border-opacity: 1;
  border-color: rgb(16 185 129 / var(--tw-border-opacity, 1));
}
.focus\\:outline-none:focus{
  outline: 2px solid transparent;
  outline-offset: 2px;
}
.active\\:scale-95:active{
  --tw-scale-x: .95;
  --tw-scale-y: .95;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}`,document.head.appendChild(S)})();var Md={studyMinutes:25,rewardMinutes:5,blockedSites:[],halfUnproductiveSites:[],productiveSites:[],dailyGoalHours:4},Dd={balanceSeconds:0,todayEarnedSeconds:0,todaySpentSeconds:0,lifetimeEarnedSeconds:0,lifetimeStudySeconds:0},Fd={isStudying:!1,activeProductiveTimestamp:null,accumulatedSeconds:0,lastRewardMilestoneSeconds:0},Yr=S=>{let j=Math.floor(S/3600),p=Math.floor(S%3600/60),b=Math.floor(S%60);return j>0?`${j}h ${p}m`:`${p}m ${b}s`},Id=S=>{let j=Math.floor(S/3600),p=Math.floor(S%3600/60),b=Math.floor(S%60);return j>0?`${j.toString().padStart(2,"0")}:${p.toString().padStart(2,"0")}:${b.toString().padStart(2,"0")}`:`${p.toString().padStart(2,"0")}:${b.toString().padStart(2,"0")}`},jd=()=>{var Rt,sn;let[S,j]=Mt("study"),[p,b]=Mt({settings:Md,wallet:Dd,timer:Fd,lastResetDate:""}),[q,Dt]=Mt(0),[Ft,It]=Mt(""),[G,qe]=Mt(""),[ke,Ie]=Mt(""),[on,ft]=Mt(!1);Ai(()=>{let P=()=>{chrome.storage.local.get(null,ne=>{b(mt=>{let an={settings:(ne==null?void 0:ne.settings)||mt.settings,wallet:(ne==null?void 0:ne.wallet)||mt.wallet,timer:(ne==null?void 0:ne.timer)||mt.timer,lastResetDate:(ne==null?void 0:ne.lastResetDate)||mt.lastResetDate},rt=an.timer;if(rt.isStudying&&rt.activeProductiveTimestamp){let En=Math.floor((Date.now()-rt.activeProductiveTimestamp)/1e3);Dt(rt.accumulatedSeconds+En)}else Dt(rt.accumulatedSeconds);return an})})};P();let le=setInterval(P,1e3);return()=>clearInterval(le)},[]);let te=P=>{chrome.runtime.sendMessage({type:P},()=>{P==="STOP_STUDY"&&Dt(0)})},Ee=async P=>{let le={...p.settings,...P};await chrome.storage.local.set({settings:le}),b(ne=>({...ne,settings:le}))},ye=()=>{Ft&&!p.settings.blockedSites.includes(Ft)&&(Ee({blockedSites:[...p.settings.blockedSites,Ft.toLowerCase()]}),It(""))},jt=P=>{if(p.wallet.balanceSeconds<3e3){alert("You need at least 50 minutes of balance to remove a blocked site.");return}Ee({blockedSites:p.settings.blockedSites.filter(le=>le!==P)})},Ut=()=>{G&&!p.settings.halfUnproductiveSites.includes(G)&&(Ee({halfUnproductiveSites:[...p.settings.halfUnproductiveSites||[],G.toLowerCase()]}),qe(""))},et=P=>{Ee({halfUnproductiveSites:p.settings.halfUnproductiveSites.filter(le=>le!==P)})},Ot=()=>{ke&&!p.settings.productiveSites.includes(ke)&&(Ee({productiveSites:[...p.settings.productiveSites||[],ke.toLowerCase()]}),Ie(""))},tt=P=>{Ee({productiveSites:p.settings.productiveSites.filter(le=>le!==P)})},pt=()=>{if(!p.settings.productiveSites||p.settings.productiveSites.length===0){alert("Please add at least one productive website in the Settings tab first!");return}ft(!0)},un=P=>{chrome.tabs.create({url:`https://${P}`}),te("START_STUDY"),ft(!1)},nt=Math.min(100,(q-(((Rt=p.timer)==null?void 0:Rt.lastRewardMilestoneSeconds)||0))/((((sn=p.settings)==null?void 0:sn.studyMinutes)||25)*60)*100)||0;return g.createElement("div",{className:"flex flex-col h-[500px] bg-slate-900 text-slate-100 overflow-hidden"},g.createElement("header",{className:"px-5 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0"},g.createElement("div",{className:"flex items-center gap-2"},g.createElement("div",{className:"w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30"},g.createElement("svg",{className:"w-5 h-5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},g.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"}))),g.createElement("h1",{className:"text-xl font-bold tracking-tight"},"EarnTime")),g.createElement("div",{className:"text-right"},g.createElement("div",{className:"text-xs text-slate-400 font-medium uppercase tracking-wider"},"Balance"),g.createElement("div",{className:"text-lg font-bold text-emerald-400"},Yr(p.wallet.balanceSeconds)))),g.createElement("main",{className:"flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar"},S==="study"&&g.createElement("div",{className:"flex flex-col items-center justify-center h-full space-y-8 animate-fade-in"},g.createElement("div",{className:"relative w-48 h-48 flex items-center justify-center"},g.createElement("svg",{viewBox:"0 0 192 192",className:"absolute inset-0 w-full h-full -rotate-90 transform"},g.createElement("circle",{cx:"96",cy:"96",r:"88",fill:"none",stroke:"#1e293b",strokeWidth:"8"}),g.createElement("circle",{cx:"96",cy:"96",r:"88",fill:"none",stroke:"#10b981",strokeWidth:"8",strokeLinecap:"round",strokeDasharray:`${2*Math.PI*88}`,strokeDashoffset:`${2*Math.PI*88*(1-nt/100)}`,className:"transition-all duration-1000 ease-linear"})),g.createElement("div",{className:"text-center z-10 flex flex-col items-center"},g.createElement("span",{className:"text-5xl font-bold tracking-tighter tabular-nums text-white"},Id(q)),g.createElement("span",{className:"text-sm text-slate-400 mt-1"},"Next reward in ",Math.ceil((p.settings.studyMinutes*60-(q-p.timer.lastRewardMilestoneSeconds))/60),"m"))),p.timer.isStudying&&!p.timer.activeProductiveTimestamp&&g.createElement("div",{className:"text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full font-medium"},"Timer paused. Open a productive site."),on?g.createElement("div",{className:"w-full max-w-[280px] bg-slate-800 rounded-xl border border-slate-700 p-3 shadow-xl"},g.createElement("div",{className:"text-xs text-slate-400 mb-2 font-medium"},"Select a site to start:"),g.createElement("div",{className:"flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar"},p.settings.productiveSites.map(P=>g.createElement("button",{key:P,onClick:()=>un(P),className:"text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition"},P))),g.createElement("button",{onClick:()=>ft(!1),className:"mt-3 text-xs text-slate-500 hover:text-slate-300 w-full text-center"},"Cancel")):g.createElement("div",{className:"flex gap-3 w-full max-w-[280px]"},!p.timer.isStudying&&q===0?g.createElement("button",{onClick:pt,className:"flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20 active:scale-95"},"Start Focus"):g.createElement(g.Fragment,null,p.timer.isStudying?g.createElement("button",{onClick:()=>te("PAUSE_STUDY"),className:"flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-amber-500/20 active:scale-95"},"Pause"):g.createElement("button",{onClick:()=>te("RESUME_STUDY"),className:"flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20 active:scale-95"},"Resume"),g.createElement("button",{onClick:()=>te("STOP_STUDY"),className:"flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition active:scale-95"},"Finish"))),g.createElement("div",{className:"text-center bg-slate-800/50 rounded-lg py-2 px-4 border border-slate-700/50 w-full max-w-[280px]"},g.createElement("div",{className:"text-xs text-slate-400"},"Current Rate"),g.createElement("div",{className:"text-sm font-medium text-slate-200"},p.settings.studyMinutes,"m study = ",p.settings.rewardMinutes,"m reward"))),S==="stats"&&g.createElement("div",{className:"space-y-4 animate-fade-in w-full min-w-0"},g.createElement("h2",{className:"text-sm font-bold text-slate-400 uppercase tracking-wider mb-2"},"Today's Activity"),g.createElement("div",{className:"grid grid-cols-2 gap-3 w-full"},g.createElement("div",{className:"bg-slate-800 p-4 rounded-xl border border-slate-700 w-full min-w-0"},g.createElement("div",{className:"text-xs text-slate-400 mb-1 flex items-center gap-1"},g.createElement("span",{className:"w-2 h-2 rounded-full bg-emerald-400"})," Earned"),g.createElement("div",{className:"text-xl font-bold truncate text-white"},Yr(p.wallet.todayEarnedSeconds))),g.createElement("div",{className:"bg-slate-800 p-4 rounded-xl border border-slate-700 w-full min-w-0"},g.createElement("div",{className:"text-xs text-slate-400 mb-1 flex items-center gap-1"},g.createElement("span",{className:"w-2 h-2 rounded-full bg-rose-400"})," Spent"),g.createElement("div",{className:"text-xl font-bold truncate text-white"},Yr(p.wallet.todaySpentSeconds)))),g.createElement("h2",{className:"text-sm font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2"},"Lifetime Statistics"),g.createElement("div",{className:"bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700/50 w-full"},g.createElement("div",{className:"flex justify-between items-center p-4"},g.createElement("span",{className:"text-slate-300"},"Total Study Time"),g.createElement("span",{className:"font-bold text-white"},Yr(p.wallet.lifetimeStudySeconds))),g.createElement("div",{className:"flex justify-between items-center p-4"},g.createElement("span",{className:"text-slate-300"},"Total Earned Time"),g.createElement("span",{className:"font-bold text-emerald-400"},Yr(p.wallet.lifetimeEarnedSeconds)))),g.createElement("div",{className:"mt-6"},g.createElement("div",{className:"flex justify-between text-xs mb-1"},g.createElement("span",{className:"text-slate-400"},"Daily Goal Progress"),g.createElement("span",{className:"text-slate-300 font-medium"},Math.floor(p.wallet.lifetimeStudySeconds/3600)," / ",p.settings.dailyGoalHours,"h")),g.createElement("div",{className:"h-2 bg-slate-800 rounded-full overflow-hidden w-full"},g.createElement("div",{className:"h-full bg-indigo-500 rounded-full",style:{width:`${Math.min(100,p.wallet.lifetimeStudySeconds/(p.settings.dailyGoalHours*3600)*100)}%`}})))),S==="settings"&&g.createElement("div",{className:"space-y-6 animate-fade-in w-full pb-4"},g.createElement("div",null,g.createElement("h2",{className:"text-sm font-bold text-slate-400 uppercase tracking-wider mb-3"},"Conversion Rate"),g.createElement("div",{className:"bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4 w-full"},g.createElement("div",{className:"flex-1 min-w-0"},g.createElement("label",{className:"text-xs text-slate-400 block mb-1"},"Study (min)"),g.createElement("input",{type:"number",min:"1",className:"w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition",value:p.settings.studyMinutes,onChange:P=>Ee({studyMinutes:Number(P.target.value)||1})})),g.createElement("div",{className:"text-slate-500 pt-5"},"\u2192"),g.createElement("div",{className:"flex-1 min-w-0"},g.createElement("label",{className:"text-xs text-slate-400 block mb-1"},"Reward (min)"),g.createElement("input",{type:"number",min:"1",className:"w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 transition",value:p.settings.rewardMinutes,onChange:P=>Ee({rewardMinutes:Number(P.target.value)||1})})))),g.createElement("div",{className:"w-full"},g.createElement("h2",{className:"text-sm font-bold text-slate-400 uppercase tracking-wider mb-3"},"Blocked Websites (Costs 50m to remove)"),g.createElement("div",{className:"flex gap-2 w-full"},g.createElement("input",{type:"text",placeholder:"e.g. netflix.com",className:"flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition text-white",value:Ft,onChange:P=>It(P.target.value),onKeyDown:P=>P.key==="Enter"&&ye()}),g.createElement("button",{onClick:ye,className:"bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg text-sm font-semibold transition shrink-0"},"Add")),g.createElement("div",{className:"mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden w-full max-h-[120px] overflow-y-auto custom-scrollbar"},p.settings.blockedSites.length===0?g.createElement("div",{className:"p-4 text-center text-sm text-slate-500"},"No sites blocked."):g.createElement("ul",{className:"divide-y divide-slate-700/50 w-full"},p.settings.blockedSites.map(P=>g.createElement("li",{key:P,className:"flex justify-between items-center p-2 px-3 hover:bg-slate-750 transition w-full"},g.createElement("span",{className:"text-sm truncate text-slate-300 max-w-[80%]"},P),g.createElement("button",{onClick:()=>jt(P),className:"text-slate-500 hover:text-rose-400 p-1 shrink-0 transition"},g.createElement("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},g.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})))))))),g.createElement("div",{className:"w-full"},g.createElement("h2",{className:"text-sm font-bold text-slate-400 uppercase tracking-wider mb-3"},"Productive Websites"),g.createElement("div",{className:"flex gap-2 w-full"},g.createElement("input",{type:"text",placeholder:"e.g. coursera.org",className:"flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition text-white",value:ke,onChange:P=>Ie(P.target.value),onKeyDown:P=>P.key==="Enter"&&Ot()}),g.createElement("button",{onClick:Ot,className:"bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg text-sm font-semibold transition shrink-0"},"Add")),g.createElement("div",{className:"mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden w-full max-h-[120px] overflow-y-auto custom-scrollbar"},!p.settings.productiveSites||p.settings.productiveSites.length===0?g.createElement("div",{className:"p-4 text-center text-sm text-slate-500"},"Add sites to earn time here."):g.createElement("ul",{className:"divide-y divide-slate-700/50 w-full"},p.settings.productiveSites.map(P=>g.createElement("li",{key:P,className:"flex justify-between items-center p-2 px-3 hover:bg-slate-750 transition w-full"},g.createElement("span",{className:"text-sm truncate text-emerald-300 max-w-[80%]"},P),g.createElement("button",{onClick:()=>tt(P),className:"text-slate-500 hover:text-rose-400 p-1 shrink-0 transition"},g.createElement("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},g.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})))))))),g.createElement("div",{className:"w-full"},g.createElement("h2",{className:"text-sm font-bold text-slate-400 uppercase tracking-wider mb-3"},"Half Unproductive (Grayscale)"),g.createElement("div",{className:"flex gap-2 w-full"},g.createElement("input",{type:"text",placeholder:"e.g. wikipedia.org",className:"flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition text-white",value:G,onChange:P=>qe(P.target.value),onKeyDown:P=>P.key==="Enter"&&Ut()}),g.createElement("button",{onClick:Ut,className:"bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg text-sm font-semibold transition shrink-0"},"Add")),g.createElement("div",{className:"mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden w-full max-h-[120px] overflow-y-auto custom-scrollbar"},!p.settings.halfUnproductiveSites||p.settings.halfUnproductiveSites.length===0?g.createElement("div",{className:"p-4 text-center text-sm text-slate-500"},"No sites added."):g.createElement("ul",{className:"divide-y divide-slate-700/50 w-full"},p.settings.halfUnproductiveSites.map(P=>g.createElement("li",{key:P,className:"flex justify-between items-center p-2 px-3 hover:bg-slate-750 transition w-full"},g.createElement("span",{className:"text-sm truncate text-slate-400 max-w-[80%]"},P),g.createElement("button",{onClick:()=>et(P),className:"text-slate-500 hover:text-rose-400 p-1 shrink-0 transition"},g.createElement("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},g.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})))))))))),g.createElement("nav",{className:"flex border-t border-slate-800 bg-slate-900 shrink-0 w-full"},[{id:"study",icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",label:"Timer"},{id:"stats",icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",label:"Stats"},{id:"settings",icon:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",label:"Settings"}].map(P=>g.createElement("button",{key:P.id,onClick:()=>j(P.id),className:`flex-1 py-3 flex flex-col items-center gap-1 transition min-w-0 ${S===P.id?"text-emerald-400 bg-slate-800/50 border-t-2 border-emerald-400":"text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border-t-2 border-transparent"}`},g.createElement("svg",{className:"w-5 h-5 shrink-0",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor"},g.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:P.icon})),g.createElement("span",{className:"text-[10px] font-medium uppercase tracking-wider truncate px-1 w-full text-center"},P.label)))))},wa=jd;var xa=document.getElementById("root");xa&&ya(xa).render(g.createElement(g.StrictMode,null,g.createElement(wa,null)));})();
/**
* @license React
* react.production.min.js
*
* Copyright (c) Facebook, Inc. and its affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
/**
* @license React
* react-dom.production.min.js
*
* Copyright (c) Facebook, Inc. and its affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
