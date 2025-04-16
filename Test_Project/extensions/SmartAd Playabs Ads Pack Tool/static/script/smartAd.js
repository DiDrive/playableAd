'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const https = require('https');
const { remote } = require('electron');
let sid = '';
let token = '';
let messageCB = null;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function main(messageCallback) {
    messageCB = messageCallback;
    let file_token = get_token();
    if (!file_token || token != file_token) {
        set_token('token', token);
    }

    sid = get_sid();
    console.log("in main", sid);
    start();
}

function start() {
    console.log("in start");
    let project_path = Editor.Project.path;
    if (!fs.existsSync(project_path)) {
        messageCB(Editor.I18n.t('smartad.project_path_not_exist')+`:${project_path}`);
        return;
    }

    try {
        var build_config = get_build_config(project_path);
        const taskMap = build_config.BuildTaskManager.taskMap;
        let taskItem = null;
        for (let k in taskMap) {
            taskItem = taskMap[k];
            break;
        }
        if (!taskItem) {
            messageCB(Editor.I18n.t('smartad.build_web_project_first'));
            return;
        }
        //发布目录;
        var build_path = taskItem.options.buildPath;

        //将构建目录相对路径转换成绝对路径(兼容build||./build)
        if (build_path.includes('project://')) {
            build_path = path.resolve(project_path, build_path.replace("project://", ""));
        }
        //console.log(build_path);
        if (!fs.existsSync(`${build_path}/${taskItem.options.outputName}`)) {
            messageCB(Editor.I18n.t('smartad.build_web_project_first'));
            //throw new Error('请先发布项目');
        }
        let platform = taskItem.options.outputName;
        let zip_file = `${build_path}/${platform}.zip`;
        console.log("in start", platform, zip_file);
        // Editor.Dialog.messageBox('hello world');return;
        pack_back(`${build_path}/${platform}`, zip_file);
    } catch (err) {
        console.log("in start error", err);
        return;
    }
}

function pack_back(build_dir, zip_file) {
    messageCB(Editor.I18n.t('smartad.packing'));
    const archiver = require('archiver');

    var output = fs.createWriteStream(zip_file);
    var archive = archiver('zip', {
        store: false // Sets the compression method to STORE.
    });

    // listen for all archive data to be written
    output.on('close', function () {
        messageCB(Editor.I18n.t('smartad.zip_success') + " " + (archive.pointer()/1024/1024).toFixed(2) + ' MB');
        upload_zip(zip_file);
    });
    // good practice to catch this error explicitly
    archive.on('error', function (err) {
        throw err;
    });
    // pipe archive data to the file
    archive.pipe(output);

    const files = fs.readdirSync(build_dir, { withFileTypes: true });
    files.forEach((dirent, index) => {
        let filePath = `${build_dir}/${dirent.name}`;
        if (dirent.isDirectory()) {
            archive.directory(filePath, '/smardAd' + filePath.replace(build_dir, ''));
        } else {
            archive.append(fs.readFileSync(filePath), { name: '/smardAd' + filePath.replace(build_dir, '') });
        }
    });

    archive.finalize();
}

function get_editor_list(home_dir) {
    //编辑器配置
    const editor_content = fs.readFileSync(home_dir + "/.Cocos/profiles/editor.json", "utf-8");
    return JSON.parse(editor_content);
}

function get_project_config(project_path) {
    const project_content = fs.readFileSync(project_path + "/project.json", "utf-8");
    return JSON.parse(project_content);
}

function get_build_config(project_path) {
    const builderPath = project_path + "/profiles/v2/packages/builder.json";
    //构建配置文件存在就读取配置文件中的目录
    if (!fs.existsSync(builderPath)) {
        messageCB(Editor.I18n.t('smartad.build_web_project_first'));
        //throw new Error('请先发布项目');
        return;
    }
    const builder_content = fs.readFileSync(builderPath, "utf-8");
    return JSON.parse(builder_content);
}
function get_editor_file(editor_version, editor_list_config) {
    let config_node = 'Creator';
    if (parseInt(editor_version) >= 3) {
        //3.x版本
        config_node = 'Creator3D';
    }
    let index = editor_list_config.editor[config_node].findIndex(editor => {
        return editor.version === editor_version;
    });
    //可以执行文件
    return editor_list_config.editor[config_node][index].file;
}

function build_project(project_path, build_path) {
    //用户主目录
    let home_dir = process.env.HOME;
    //操作系统
    let platform = process.platform;
    //项目配置
    var project_config = get_project_config(project_path);
    //编辑器列表
    var editor_list_config = get_editor_list(home_dir);

    let editor_version = project_config.version;
    let editor_file = get_editor_file(editor_version, editor_list_config);

    let execSync = require('child_process').execSync;
    let cmd = `echo 123456 | sudo -S `;
    cmd += `${editor_file}/Contents/MacOS/CocosCreator --path ${project_path} --build buildPath=${build_path}`;
    // Editor.log(cmd);return;
    execSync(cmd, (error, stdout, stderr) => {
        Editor.log('error=' + error);
        Editor.log('stdout=' + stdout);
        Editor.log('stderr=' + stderr);
    });
}

function upload_zip(zip_file) {
    if (!fs.existsSync(zip_file)) {
        messageCB(Editor.I18n.t('smartad.pack_file_not_exist'));
        return;
    }
    let url = config.upload_url;
    // let formData = {
    //     zip: fs.createReadStream(zip_file),
    // };
    messageCB(Editor.I18n.t('smartad.pack_uploading'));

    request_i({ url, zip_file }, (body) => {
        let ret = JSON.parse(body);
        if (ret.code === 200 && !ret.data.error) {
            messageCB(Editor.I18n.t('upload_success'));
            export_playable(ret.data);
        } else {
            if ([1002, 1003].includes(ret.code)) {
                set_token('');
            }
            if (ret.data.error && ret.data.error.length > 0) {
                messageCB(Editor.I18n.t('smartad.upload_failed') + ret.data.error.join('\n'));
            } else {
                messageCB(Editor.I18n.t('smartad.upload_failed') + ret.msg);
            }
        }
    })
}

function export_playable(pack) {
    messageCB(Editor.I18n.t('smartad.exporting_playable_ads'));
    let url = config.export_url;
    let formData = {
        channel: "Google ads",
        urls: {},
        platform: '',
        name: pack.file_name,
        zip_id: pack.id,
        zip_md5: pack.file_md5
    };
    let host = config.host;
    request_i({ url, formData }, (body) => {
        let ret = JSON.parse(body);
        if (ret.code === 200) {
            let url = `${host}/user/playable?material_no=${ret.material_no}&sid=` + sid;
            if (token) {
                url = `${host}/user/playable?token=${token}`;
            }
            messageCB(Editor.I18n.t('smartad.export_success') +`: <br/><a target="_blank" href="${url}">${url}</a>`);
        } else {
            messageCB(Editor.I18n.t('smartad.export_failed') +ret.msg);
        }
    });
}

function get_token() {
    let token_file = path.resolve(__dirname, '.token');
    if (!fs.existsSync(token_file)) {
        return '';
    }
    return fs.readFileSync(token_file, "utf-8");
}
function get_sid() {
    let sid_file = path.resolve(__dirname, '.sid');

    if (!fs.existsSync(sid_file)) {
        let sid = Number(Math.random().toString().substr(2, 10) + Date.now()).toString(36);
        set_token('sid', sid);
        return sid;
    }
    return fs.readFileSync(sid_file, "utf-8");
}

function set_token(key = 'token', token = '') {
    let token_file = path.resolve(__dirname, `.${key}`);
    fs.writeFile(token_file, token, err => {
        //Editor.log(err);
    });
}


function request_i(params, callback) {
    let headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
        'Content-type': 'application/json'
    }
    if (!token) {
        headers.sid = sid;
    } else {
        headers.token = token;
    }
    const url_host = config.host.replace('https://', "").replace('http://', "");
    const url_path = params.url;
    const options = {
        hostname: url_host,
        port: 443,
        path: url_path,
        method: 'POST',
        headers: headers,
    };

    let req = https.request(options, res => {

        console.log(`statusCode: ${res.statusCode}`);

        res.on('data', d => {
            console.log(`data: ${d}`);
            callback(d);
        });

    });

    req.on('error', error => {
        console.error("error:", error);
    });

    if (url_path.indexOf("upload_zip") != -1) {
        req = writeBinaryPostData(req,params.zip_file)
    } else {
        console.log(JSON.stringify(params.formData));
        req.write(JSON.stringify(params.formData));
    }

    req.end();
}

function writeBinaryPostData(req, filepath) {
    var fs = require('fs'),
        data = fs.readFileSync(filepath);

    var crlf = "\r\n",
        boundaryKey = Math.random().toString(16),
        boundary = `--${boundaryKey}`,
        delimeter = `${crlf}--${boundary}`,
        headers = [
            'Content-Disposition: form-data; name="zip"; filename="cocos_zip.zip"' + crlf
        ],
        closeDelimeter = `${delimeter}--`,
        multipartBody;


    multipartBody = Buffer.concat([
        new Buffer(delimeter + crlf + headers.join('') + crlf),
        data,
        new Buffer(closeDelimeter)]
    );

    req.setHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
    req.setHeader('Content-Length', multipartBody.length);

    req.write(multipartBody);
    return req;
}

function openDefaultBrowser(url) {
    var exec = require('child_process').exec;
    console.log('platform=' + process.platform)
    switch (process.platform) {
        case "darwin":
            exec('open ' + url);
            break;
        case "win32":
            exec('start ' + url);
            break;
        default:
            exec('xdg-open', [url]);
    }
}
exports.openDefaultBrowser = openDefaultBrowser;
exports.main = main;