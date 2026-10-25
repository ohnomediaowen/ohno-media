/* ohno.media Watch Live: embedded player + chat with a Twitch / YouTube switch.
 *
 * SETTINGS
 * - Twitch is on and is the default.
 * - YouTube is ready but switched off. To turn it on:
 *     1. set youtube.enabled to true
 *     2. set youtube.channelId to the channel's ID (starts with "UC", from YouTube Studio > Settings > Channel > Advanced)
 *     3. for live chat, set youtube.liveVideoId to the current live stream's video ID
 *        (the part after "v=" in the stream's URL). Without it, the player still works and the
 *        chat panel links to YouTube instead.
 *   Once YouTube is on, a Twitch / YouTube switch appears above the player.
 */
(function () {
  var LIVE = {
    defaultPlatform: "twitch",
    twitch: { enabled: true, channel: "onrslive" },
    youtube: { enabled: false, handle: "ohnomedia", channelId: "", liveVideoId: "" }
  };

  // Twitch only plays on sites listed here (plus whatever site the page is on right now)
  var SITES = ["ohno.media", "www.ohno.media", "peaceful-lolly-1424f8.netlify.app"];

  var player = document.getElementById("livePlayer");
  var chat = document.getElementById("liveChat");
  var sw = document.getElementById("liveSwitch");
  var note = document.getElementById("liveNote");
  if (!player || !chat) return;

  var host = location.hostname || "localhost";
  var parents = SITES.indexOf(host) >= 0 ? SITES : SITES.concat([host]);
  var parentQs = parents.map(function (p) { return "parent=" + encodeURIComponent(p); }).join("&");
  var dark = "darkpopout";

  function frame(src, title, allow) {
    var f = document.createElement("iframe");
    f.src = src;
    f.title = title;
    f.setAttribute("allowfullscreen", "");
    if (allow) f.allow = allow;
    f.loading = "lazy";
    return f;
  }
  function placeholder(html) {
    var d = document.createElement("div");
    d.className = "live-placeholder";
    d.innerHTML = html;
    return d;
  }

  var builders = {
    twitch: function () {
      var c = encodeURIComponent(LIVE.twitch.channel);
      return {
        player: frame("https://player.twitch.tv/?channel=" + c + "&" + parentQs + "&autoplay=true&muted=true", "Oh No Radio Show on Twitch", "autoplay; fullscreen; picture-in-picture"),
        chat: frame("https://www.twitch.tv/embed/" + c + "/chat?" + dark + "&" + parentQs, "Twitch chat"),
        note: "Streaming on Twitch at twitch.tv/" + LIVE.twitch.channel + ". If nothing is playing, we're offline right now."
      };
    },
    youtube: function () {
      var y = LIVE.youtube;
      var playerEl = y.channelId
        ? frame("https://www.youtube.com/embed/live_stream?channel=" + encodeURIComponent(y.channelId) + "&autoplay=1&mute=1", "Oh No Radio Show on YouTube", "autoplay; encrypted-media; fullscreen; picture-in-picture")
        : placeholder('YouTube player not set up yet. <a href="https://www.youtube.com/@' + y.handle + '/live" target="_blank" rel="noopener">Watch on YouTube ↗</a>');
      var chatEl = y.liveVideoId
        ? frame("https://www.youtube.com/live_chat?v=" + encodeURIComponent(y.liveVideoId) + "&embed_domain=" + encodeURIComponent(host), "YouTube live chat")
        : placeholder('YouTube chat appears here during a live stream. <a href="https://www.youtube.com/@' + y.handle + '/live" target="_blank" rel="noopener">Open the live chat on YouTube ↗</a>');
      return { player: playerEl, chat: chatEl, note: "Streaming on YouTube at youtube.com/@" + y.handle + "." };
    }
  };

  var available = ["twitch", "youtube"].filter(function (k) { return LIVE[k] && LIVE[k].enabled; });
  var current = null;

  function select(name) {
    if (current === name || !builders[name]) return;
    current = name;
    var b = builders[name]();
    player.replaceChildren(b.player);
    chat.replaceChildren(b.chat);
    note.textContent = b.note;
    [].forEach.call(sw.querySelectorAll("button"), function (btn) { btn.setAttribute("aria-selected", btn.dataset.p === name ? "true" : "false"); });
  }

  // The switch only shows when more than one platform is turned on
  if (available.length > 1) {
    available.forEach(function (k) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.dataset.p = k;
      btn.textContent = k === "twitch" ? "Twitch" : "YouTube";
      btn.addEventListener("click", function () { select(k); });
      sw.appendChild(btn);
    });
  }

  // Only load the stream when someone opens the Watch Live page
  function maybeStart() {
    if ((location.hash || "").slice(1) !== "live" || current) return;
    var first = available.indexOf(LIVE.defaultPlatform) >= 0 ? LIVE.defaultPlatform : available[0];
    if (first) select(first);
    else { player.replaceChildren(placeholder("Live stream coming soon.")); chat.replaceChildren(); }
  }
  window.addEventListener("hashchange", maybeStart);
  maybeStart();
})();
