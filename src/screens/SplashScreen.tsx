import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const GREEN_DEEP = '#1F6E33';

const SPLASH_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --green:#2E8B45; --green-deep:#1F6E33;
    --ease:cubic-bezier(.22,.61,.36,1); --ease-out:cubic-bezier(.16,1,.3,1);
  }
  *{ box-sizing:border-box; margin:0; padding:0; }
  html,body{ height:100%; width:100%; }
  body{ font-family:'Poppins',sans-serif; overflow:hidden; position:relative; background:#fff; }

  .splash{
    position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
    background:radial-gradient(120% 90% at 50% 44%, var(--green) 0%, var(--green-deep) 78%);
    z-index:10; animation: splashOut .9s var(--ease-out) 3.0s forwards;
  }
  @keyframes splashOut{ 0%{opacity:1;} 100%{opacity:0; visibility:hidden;} }

  .stage{
    position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:clamp(14px,3vw,28px);
    transform:translateY(-2%); animation: lift .9s var(--ease-out) 3.0s forwards;
  }
  @keyframes lift{ 0%{transform:translateY(-2%) scale(1);} 100%{transform:translateY(-7%) scale(1.04);} }

  .mark{ width:clamp(160px,42vw,240px); height:auto; overflow:visible; flex:none; }
  .leaf,.flow{ opacity:0; transform-box:fill-box; }
  .leaf{ transform-origin:50% 100%; }
  .leaf-1{ animation: sprout .9s var(--ease) .35s forwards; }
  .leaf-2{ animation: sprout .9s var(--ease) .52s forwards; }
  .leaf-3{ animation: sprout .9s var(--ease) .52s forwards; }
  .leaf-4{ animation: sprout .9s var(--ease) .70s forwards; }
  .leaf-5{ animation: sprout .9s var(--ease) .70s forwards; }
  @keyframes sprout{
    0%{ opacity:0; transform:translateY(14px) scaleY(.2) rotate(var(--r,0deg)); }
    60%{ opacity:1; }
    100%{ opacity:1; transform:translateY(0) scaleY(1) rotate(0deg); }
  }
  .flow{ transform-origin:50% 50%; animation: flowIn .85s var(--ease-out) 1.05s forwards; }
  @keyframes flowIn{ 0%{opacity:0; transform:translateX(-10px) scaleX(.4);} 100%{opacity:.95; transform:translateX(0) scaleX(1);} }
  .shimmer{ opacity:0; animation: shimmerSweep 2.6s ease-in-out 1.7s infinite; }
  @keyframes shimmerSweep{ 0%,100%{opacity:0; transform:translateX(-30px);} 18%{opacity:.8;} 50%{opacity:.2; transform:translateX(34px);} 70%{opacity:0;} }
  .plant{ transform-box:fill-box; transform-origin:50% 100%; animation: breathe 5s ease-in-out 1.9s infinite; }
  @keyframes breathe{ 0%,100%{transform:scale(1);} 50%{transform:scale(1.02);} }

  .word{
    font-weight:600; font-size:clamp(34px,9vw,56px); letter-spacing:.18em; color:#fff;
    opacity:0; transform:translateY(10px); white-space:nowrap; text-align:center;
    text-shadow:0 2px 18px rgba(0,0,0,.12);
    animation: wordIn 1s var(--ease) 1.25s forwards;
  }
  .word .flowtxt{ font-weight:700; }
  @keyframes wordIn{ 0%{opacity:0; transform:translateY(10px); letter-spacing:.32em;} 100%{opacity:1; transform:translateY(0); letter-spacing:.12em;} }
</style>
</head>
<body>
  <div class="splash" id="splash">
    <div class="stage">
      <svg class="mark" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#DDF1D2"/></linearGradient>
          <linearGradient id="gMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#EAF7E2"/><stop offset="100%" stop-color="#BCE3AB"/></linearGradient>
          <linearGradient id="gDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C6E7B6"/><stop offset="100%" stop-color="#94CC7F"/></linearGradient>
          <linearGradient id="gFlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#DCF2D0" stop-opacity=".85"/><stop offset="50%" stop-color="#ffffff" stop-opacity=".95"/><stop offset="100%" stop-color="#DCF2D0" stop-opacity=".85"/></linearGradient>
          <linearGradient id="gShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#fff" stop-opacity="0"/><stop offset="50%" stop-color="#fff" stop-opacity="1"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <clipPath id="flowClip"><path d="M44 150 C70 138 130 138 160 150 C132 168 70 168 44 150 Z"/></clipPath>
        </defs>
        <g class="plant">
          <path class="leaf leaf-4" style="--r:-6deg" d="M100 150 C70 142 44 120 40 92 C66 96 92 116 100 150 Z" fill="url(#gDeep)"/>
          <path class="leaf leaf-5" style="--r:6deg"  d="M100 150 C130 142 156 120 160 92 C134 96 108 116 100 150 Z" fill="url(#gDeep)"/>
          <path class="leaf leaf-2" style="--r:-5deg" d="M100 150 C84 124 70 96 74 64 C92 84 102 116 100 150 Z" fill="url(#gMid)"/>
          <path class="leaf leaf-3" style="--r:5deg"  d="M100 150 C116 124 130 96 126 64 C108 84 98 116 100 150 Z" fill="url(#gMid)"/>
          <path class="leaf leaf-1" d="M100 150 C92 110 92 70 100 36 C108 70 108 110 100 150 Z" fill="url(#gLight)"/>
        </g>
        <path class="flow" d="M44 150 C70 138 130 138 160 150 C132 168 70 168 44 150 Z" fill="url(#gFlow)"/>
        <g clip-path="url(#flowClip)"><rect class="shimmer" x="40" y="136" width="26" height="34" fill="url(#gShine)"/></g>
      </svg>
      <div class="word"><span class="rice">Rice</span><span class="flowtxt">Flow</span></div>
    </div>
  </div>

  <script>
    setTimeout(function(){
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('done');
    }, 3950);
  </script>
</body>
</html>
`;

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: SPLASH_HTML }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        onMessage={(event) => {
          if (event.nativeEvent.data === 'done') onDone();
        }}
        onLoadEnd={() => {
          setTimeout(onDone, 4300);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GREEN_DEEP },
  webview:   { flex: 1, backgroundColor: GREEN_DEEP },
});
