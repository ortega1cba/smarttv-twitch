/*
 * Copyright (c) 2017-2020 Felipe de Leon <fglfgl27@gmail.com>
 *
 * This file is part of SmartTwitchTV <https://github.com/fgl27/SmartTwitchTV>
 *
 * SmartTwitchTV is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SmartTwitchTV is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmartTwitchTV.  If not, see <https://github.com/fgl27/SmartTwitchTV/blob/master/LICENSE>.
 *
 */

//Variable initialization
var Chat_Messages = [];
var Chat_MessagesNext = [];
var Chat_addlinesId;
var Chat_cursor = null;
var Chat_loadChatId;
var Chat_loadChatNextId;
var Chat_offset = 0;
var Chat_title = '';
var defaultColors = [
    '#FC4F4F',
    '#ff8736',
    '#ffd830',
    '#ffff35',
    '#81ff2c',
    '#2dff2d',
    '#21ff7a',
    '#0fffc0',
    '#0fffff',
    '#20cfff',
    '#4d9bff',
    '#ff74ff',
    '#ff93ff',
    '#ff63ab',
    '#63FFBF',
    '#A363FF',
    '#B3FF63',
    '#D463FF'
];

var defaultColorsLength = defaultColors.length;
var Chat_div = [];
var Chat_Position = 0;
var Chat_hasEnded = false;
var Chat_CleanMax = 60;
var Chat_JustStarted = true;
var Chat_comment_ids = {};

var Chat_loadChatRequestPost =
    '{"operationName":"VideoCommentsByOffsetOrCursor","variables":{"videoID":"%v","contentOffsetSeconds":%o},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"}}}';
var Chat_loadChatRequestPost_Cursor =
    '{"operationName":"VideoCommentsByOffsetOrCursor","variables":{"videoID":"%v","cursor":"%c"},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"}}}';

var Chat_UserJPKRegex = new RegExp('[^\x00-\x7F]', 'g');
var Chat_token;

//Variable initialization end

function Chat_Preinit() {
    Chat_div[0] = Main_getElementById('chat_box0');
    ChatLive_LineAddCounter[0] = 0;
    ChatLive_LineAddCounter[1] = 0;
    ChatLive_Messages[0] = [];
    ChatLive_Messages[1] = [];
}

function Chat_Init() {
    Chat_JustStarted = true;
    Chat_Clear();

    if (Main_values.Play_ChatForceDisable) {
        Chat_Disable();
        return;
    }

    if (!Main_IsNotBrowser) {
        Chat_StartFakeClock();
    }

    Chat_loadBadgesGlobal();

    ChatLive_SetOptions(0, Main_values.Main_selectedChannel_id, Main_values.Main_selectedChannel);

    Chat_loadChat(Chat_Id[0]);
}

function Chat_StartFakeClock() {
    PlayVod_currentTime = Chat_offset * 1000;
    Chat_StartFakeClockTimeout();
}

function Chat_StartFakeClockTimeout() {
    if ((PlayClip_isOn || PlayVod_isOn) && !Chat_hasEnded) {
        PlayVod_currentTime += 1000;

        Main_setTimeout(Chat_StartFakeClockTimeout, 1000);
    }
}

var Chat_LoadGlobalBadges = false;
function Chat_loadBadgesGlobal() {
    //return;
    if (!Chat_LoadGlobalBadges) Chat_loadBadgesGlobalRequest(0);
    if (!extraEmotesDone.bttvGlobal) Chat_loadBTTVGlobalEmotes(0);
    if (!extraEmotesDone.ffzGlobal) Chat_loadEmotesffz(0);
    if (!extraEmotesDone.Seven_tvGlobal) Chat_loadSeven_tvGlobalEmotes(0);

    ChatLiveControls_Set();
}

function Chat_BaseLoadUrl(theUrl, tryes, callbackSucess, calbackError) {
    BasexmlHttpGet(theUrl, DefaultHttpGetTimeout * 2 + tryes * DefaultHttpGetTimeoutPlus, 0, null, callbackSucess, calbackError, tryes);
}

function Chat_loadBadgesGlobalRequest(tryes) {
    BasexmlHttpGet(
        Main_helix_api + 'chat/badges/global',
        DefaultHttpGetTimeout * 2 + tryes * DefaultHttpGetTimeoutPlus,
        0,
        null,
        Chat_loadBadgesGlobalSuccess,
        Chat_loadBadgesGlobalError,
        tryes,
        0,
        true
    );
}

function Chat_loadBadgesGlobalError(tryes) {
    if (tryes < DefaultHttpGetReTryMax) Chat_loadBadgesGlobalRequest(tryes + 1);
}

function Chat_loadBadgesGlobalSuccess(responseText) {
    var versions,
        property,
        url,
        innerHTML = '';

    var responseObj = JSON.parse(responseText);

    responseObj.data.forEach(function (set) {
        property = set.set_id;
        versions = set.versions;

        versions.forEach(function (version) {
            url = Chat_BasetagCSSUrl(version.image_url_4x);
            innerHTML += Chat_BasetagCSS(property + 0, version.id, url);
            innerHTML += Chat_BasetagCSS(property + 1, version.id, url);
        });
    });

    Chat_tagCSS(innerHTML, document.head);
    Chat_LoadGlobalBadges = true;
}

function Chat_loadBadgesTransform(responseObj, checkSubMissing) {
    var versions,
        property,
        url,
        innerHTML = [],
        versionInt;

    innerHTML[0] = '';
    innerHTML[1] = '';

    responseObj.data.forEach(function (set) {
        property = set.set_id;
        versions = set.versions;

        versions.forEach(function (version) {
            url = Chat_BasetagCSSUrl(version.image_url_4x);
            innerHTML[0] += Chat_BasetagCSS(property + 0, version.id, url);
            innerHTML[1] += Chat_BasetagCSS(property + 1, version.id, url);

            //some channel may be missing 0 3 6 12 etc badges but they have 2000 2003 etc
            if (checkSubMissing) {
                versionInt = parseInt(version.id) - parseInt(version.id.toString()[0]) * Math.pow(10, version.length - 1);

                if (versionInt > -1 && !versions.hasOwnProperty(versionInt)) {
                    innerHTML[0] += Chat_BasetagCSS(property + 0, versionInt, url);
                    innerHTML[1] += Chat_BasetagCSS(property + 1, versionInt, url);
                }
            }
        });
    });

    return innerHTML;
}

function Chat_BasetagCSS(type, version, url) {
    //a prevent class starting with numbers
    return '.a' + type + '-' + version + url;
}

function Chat_BasetagCSSUrl(url) {
    //a prevent class starting with numbers
    return ' { background-image: url("' + url.replace('http:', 'https:') + '"); }';
}

function Chat_tagCSS(content, doc) {
    Main_ready(function () {
        var style = document.createElement('style');
        style.innerHTML = content;
        doc.appendChild(style);
    });
}

function Chat_loadBTTVGlobalEmotes(tryes) {
    Chat_BaseLoadUrl('https://api.betterttv.net/3/cached/emotes/global', tryes, Chat_loadEmotesSuccessBttv, Chat_loadEmotesBttvError);
}

function Chat_loadEmotesBttvError(tryes) {
    if (tryes < DefaultHttpGetReTryMax) Chat_loadBTTVGlobalEmotes(tryes + 1);
}

function Chat_loadEmotesSuccessBttv(data) {
    Chat_loadEmotesbttvGlobal(JSON.parse(data));
}

function Chat_loadEmotesbttvGlobal(data) {
    extraEmotesDone.bttvGlobal = {};

    var url, chat_div, id;

    try {
        data.forEach(function (emote) {
            url = ChatLive_Base_BTTV_url + emote.id + '/3x';
            chat_div = emoteTemplate(url);
            id = emote.code + emote.id;

            extraEmotes[emote.code] = {
                code: emote.code,
                id: id,
                chat_div: chat_div,
                '4x': url
            };

            extraEmotesDone.bttvGlobal[emote.code] = {
                code: emote.code,
                id: id,
                chat_div: chat_div,
                '4x': url
            };
        });
    } catch (e) {
        Main_Log('Chat_loadEmotesbttvGlobal ' + e);
    }
}

function Chat_loadSeven_tvGlobalEmotes(tryes) {
    Chat_BaseLoadUrl('https://api.7tv.app/v2/emotes/global', tryes, Chat_loadEmotesSuccessSeven_tv, Chat_loadEmotesErrorSeven_tv);
}

function Chat_loadEmotesErrorSeven_tv(tryes) {
    if (tryes < DefaultHttpGetReTryMax) Chat_loadSeven_tvGlobalEmotes(tryes + 1);
}

function Chat_loadEmotesSuccessSeven_tv(data) {
    ChatLive_loadEmotesseven_tv(JSON.parse(data), 0, true);
}

function Chat_loadEmotesffz(tryes) {
    Chat_BaseLoadUrl('https://api.frankerfacez.com/v1/set/global', tryes, Chat_loadEmotesSuccessffz, Chat_loadEmotesErrorffz);
}

function Chat_loadEmotesErrorffz(tryes) {
    if (tryes < DefaultHttpGetReTryMax) Chat_loadEmotesffz(tryes + 1);
}

function Chat_loadEmotesSuccessffz(data) {
    ChatLive_loadEmotesffz(JSON.parse(data), 0, true);
}

function Chat_loadChat(id) {
    if (Chat_Id[0] === id) Chat_loadChatRequest(id);
}

function Chat_loadChatRequest(id) {
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.open('POST', PlayClip_BaseClipUrl, true);
    xmlHttp.timeout = DefaultHttpGetTimeout * 2;
    xmlHttp.setRequestHeader(Main_clientIdHeader, Chat_token);
    xmlHttp.setRequestHeader('Content-Type', 'application/json');

    xmlHttp.ontimeout = function () {};

    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState === 4) {
            if (xmlHttp.status === 200) {
                Chat_loadChatSuccess(xmlHttp.responseText, id);
            } else {
                Chat_loadChatError(id);
            }
        }
    };

    xmlHttp.send(Chat_loadChatRequestPost.replace('%v', Main_values.ChannelVod_vodId).replace('%o', Chat_offset ? parseInt(Chat_offset) : 0));
}

function Chat_loadChatError(id) {
    if (Chat_Id[0] === id) {
        Chat_loadChatId = Main_setTimeout(
            function () {
                var time = PlayVod_currentTime / 1000;
                if (time && time < Chat_offset) Chat_offset = time;

                Chat_loadChatRequest(id, 0);
            },
            2500,
            Chat_loadChatId
        );
    }
}

function Chat_loadChatSuccess(response, id) {
    if (Chat_hasEnded || Chat_Id[0] !== id) return;

    var responseText = JSON.parse(response),
        comments;

    var duplicatedCounter = 0,
        div,
        mmessage,
        null_next = Chat_cursor === null,
        nickColor,
        atstreamer,
        atuser,
        hasbits,
        message_text,
        badges,
        fragment,
        i,
        len,
        j,
        len_j,
        messageObj;

    if (responseText.data && responseText.data.video && responseText.data.video.comments && responseText.data.video.comments.edges) {
        comments = responseText.data.video.comments.edges || [];
        Chat_cursor = comments.length ? comments[0].cursor : '';
    } else {
        return;
    }

    if (null_next) {
        Chat_MessageVector({
            chat_number: 0,
            time: 0,
            message:
                '<span class="message">' +
                STR_LOADING_CHAT +
                STR_SPACE +
                Main_values.Main_selectedChannelDisplayname +
                STR_SPACE +
                Chat_title +
                '</span>'
        });

        Chat_MessageVector({
            chat_number: 0,
            time: 0,
            message: '<span class="message">' + STR_CHAT_CONNECTED + '</span>'
        });
    }
    Chat_offset = 0;

    for (i = 0, len = comments.length; i < len; i++) {
        comments[i] = comments[i].node;

        //prevent duplicated
        if (Chat_comment_ids[comments[i].id]) {
            duplicatedCounter++;
            continue;
        }
        Chat_comment_ids[comments[i].id] = true;

        //some comments have no commenter I assume those have ben deleted during live chat but not fully from chat history
        if (!comments[i].commenter) continue;

        atstreamer = false;
        atuser = false;
        hasbits = false;
        message_text = '';

        div = '';
        mmessage = comments[i].message;

        if (!ChatLive_Highlight_Actions && mmessage.is_action) continue;

        if (ChatLive_Show_TimeStamp) {
            div += Play_timeS(comments[i].contentOffsetSeconds) + ' ';
        }

        //Add badges
        if (mmessage.hasOwnProperty('userBadges')) {
            for (j = 0, len_j = mmessage.userBadges.length; j < len_j; j++) {
                badges = mmessage.userBadges[j];

                if (!badges.setID || !badges.version) {
                    continue;
                }

                div += '<span class="a' + badges.setID + '0-' + badges.version + ' tag"></span>';
            }
        }

        //TODO check support for this feature
        //hasbits = mmessage.hasOwnProperty('bits_spent') && cheers.hasOwnProperty(ChatLive_selectedChannel_id[0]);

        if (mmessage.fragments) {
            for (j = 0, len_j = mmessage.fragments.length; j < len_j; j++) {
                fragment = mmessage.fragments[j];

                if (fragment.emote) message_text += emoteTemplate(emoteURL(fragment.emote.emoteID));
                else {
                    message_text += ChatLive_extraMessageTokenize([fragment.text], 0, hasbits ? mmessage.bits_spent : 0);

                    if (!atstreamer && ChatLive_Highlight_AtStreamer && ChatLive_Channel_Regex_Search[0].test(fragment.text)) {
                        atstreamer = true;
                    } else if (!atuser && ChatLive_Highlight_AtUser && ChatLive_User_Regex_Search.test(fragment.text)) {
                        atuser = true;
                    }
                }
            }
        }

        if (
            ChatLive_Highlight_User_send &&
            Main_A_includes_B(comments[i].commenter.displayName.toLowerCase(), AddUser_UsernameArray[0].display_name.toLowerCase())
        ) {
            atuser = true;
        }

        //Add nick
        if (atstreamer || (ChatLive_Highlight_Bits && hasbits)) {
            nickColor = chat_Line_highlight_green;
        } else if (atuser) {
            nickColor = chat_Line_highlight_blue;
        } else {
            if (!ChatLive_Custom_Nick_Color && mmessage.userColor) {
                nickColor = 'style="color: ' + mmessage.userColor + ';"';
            } else {
                nickColor = 'style="color: ' + defaultColors[comments[i].commenter.displayName.charCodeAt(0) % defaultColorsLength] + ';"';
            }
        }
        div +=
            '<span ' +
            (mmessage.is_action ? 'class="class_bold" ' + nickColor : '') +
            nickColor +
            '>' +
            comments[i].commenter.displayName +
            Chat_CheckUserName(comments[i].commenter.displayName, comments[i].commenter.login) +
            '</span>' +
            (mmessage.is_action ? '' : '&#58;') +
            '&nbsp;';

        //Add mesage
        div += '<span class="message' + (mmessage.is_action ? ' class_bold" ' + nickColor : '"') + '>' + message_text + '</span>';

        messageObj = {
            chat_number: 0,
            time: comments[i].contentOffsetSeconds,
            message: div,
            atstreamer: atstreamer,
            atuser: atuser,
            hasbits: hasbits && ChatLive_Highlight_Bits
        };

        if (null_next) Chat_MessageVector(messageObj);
        else if (Chat_cursor !== '') Chat_MessageVectorNext(messageObj);
    }

    if (null_next && Chat_Id[0] === id) {
        Chat_JustStarted = false;
        Chat_Play(id);
        if (Chat_cursor !== '') Chat_loadChatNext(id); //if (Chat_cursor === '') chat has ended
    }
}

function Chat_CheckUserName(displayName, login) {
    if (displayName && Chat_UserJPKRegex.test(displayName)) {
        return ' (' + login + ')';
    }

    return '';
}

function Chat_MessageVector(messageObj) {
    Chat_Messages.push(messageObj);
}

function Chat_MessageVectorNext(messageObj) {
    Chat_MessagesNext.push(messageObj);
}

function Chat_Play(id) {
    if (!Chat_JustStarted && !Chat_hasEnded && Chat_Id[0] === id && !Main_values.Play_ChatForceDisable) {
        Main_Addline(id);
        Chat_addlinesId = Main_setInterval(
            function () {
                Main_Addline(id);
            },
            1000,
            Chat_addlinesId
        );
    }
}

function Chat_Pause() {
    Main_clearTimeout(Chat_loadChatId);
    Main_clearTimeout(Chat_loadChatNextId);
    Main_clearInterval(Chat_addlinesId);
}

function Chat_Clear() {
    // on exit cleanup the div
    Chat_hasEnded = false;
    Chat_Pause();
    Chat_Id[0] = 0;
    Main_emptyWithEle(Chat_div[0]);
    Chat_cursor = null;
    Chat_Messages = [];
    Chat_MessagesNext = [];
    Chat_Position = 0;
    Chat_comment_ids = {};
    ChatLive_ClearIds(0);
    ChatLive_resetChatters(0);
}

function Main_Addline(id) {
    var i,
        len = Chat_Messages.length;

    if (Chat_Position < len - 1) {
        i = Chat_Position;
        for (i; i < len; i++, Chat_Position++) {
            if (Chat_Messages[i].time < PlayVod_currentTime / 1000) {
                ChatLive_ElemntAdd(Chat_Messages[i]);
            } else {
                break;
            }
        }
    } else {
        if (Chat_cursor !== '') {
            //array.slice() may crash RangeError: Maximum call stack size exceeded
            Chat_Messages = Main_Slice(Chat_MessagesNext);

            Chat_Position = 0;

            Chat_MessagesNext = [];

            if (Chat_Id[0] === id) Chat_loadChatNext(id);
            Chat_Clean(0);
        } else {
            //Chat has ended

            if (!Chat_hasEnded) {
                ChatLive_ElemntAdd({
                    chat_number: 0,
                    message: '&nbsp;<span class="message">' + STR_BR + STR_BR + STR_CHAT_END + STR_BR + STR_BR + '</span>'
                });
            }

            Chat_hasEnded = true;
            Main_clearInterval(Chat_addlinesId);
        }
    }
}

function Chat_loadChatNext(id) {
    if (!Chat_hasEnded && Chat_Id[0] === id) Chat_loadChatNextRequest(id);
}

function Chat_loadChatNextRequest(id) {
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.open('POST', PlayClip_BaseClipUrl, true);
    xmlHttp.timeout = DefaultHttpGetTimeout * 2;
    xmlHttp.setRequestHeader(Main_clientIdHeader, Chat_token);
    xmlHttp.setRequestHeader('Content-Type', 'application/json');

    xmlHttp.ontimeout = function () {};

    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState === 4) {
            if (xmlHttp.status === 200) {
                Chat_loadChatSuccess(xmlHttp.responseText, id);
            } else {
                Chat_loadChatNextError(id);
            }
        }
    };

    xmlHttp.send(Chat_loadChatRequestPost_Cursor.replace('%v', Main_values.ChannelVod_vodId).replace('%c', Chat_cursor));
}

function Chat_loadChatNextError(id) {
    if (Chat_Id[0] === id) {
        Chat_loadChatNextId = Main_setTimeout(
            function () {
                Chat_loadChatNextRequest(id, 0);
            },
            2500,
            Chat_loadChatNextId
        );
    }
}

function Chat_NoVod() {
    Chat_Clear();
    Chat_SingleLine(STR_NO_BROADCAST_WARNING + STR_BR + STR_NO_CHAT);
}

function Chat_Disable() {
    Chat_Clear();
    Chat_SingleLine(STR_CHAT_DISABLE);
}

function Chat_SingleLine(Line) {
    var div = '&nbsp;';
    div += '<span class="message">';
    div += Line;
    div += '</span>';

    var elem = document.createElement('div');
    elem.className = 'chat_line';
    elem.innerHTML = div;

    Chat_div[0].appendChild(elem);
}

function Chat_Clean(chat_number) {
    //delete old lines out of view
    var linesToDelete = Chat_div[chat_number].getElementsByClassName('chat_line'),
        i = 0,
        len = linesToDelete.length - Chat_CleanMax;

    if (len > 0) {
        for (i; i < len; i++) {
            Chat_div[chat_number].removeChild(linesToDelete[0]);
        }
    }
}
