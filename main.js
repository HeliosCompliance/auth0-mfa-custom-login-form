const scope = "openid profile email";

let webauth
let domain;
let clientId;
let audience;
let token;


window.onload = async () => {
    log("creating auth0 client");
    var res = httpRequest({
        method: "GET",
        url: `/config.json`,
    });
    domain = res.domain;
    clientId = res.client_id;
    audience = res.audience;
}

const logout = () => {
    location.href = "/"
};

const log = (text) => {
    console.log(new Date(), text);
}

const httpRequest = ({ method, url, body, headers }) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open(method, url, false);
    if (headers) {
        for (var header in headers) {
            xmlHttp.setRequestHeader(header, headers[header]);
        }
    }
    if (body == undefined) {
        xmlHttp.send(null);
    } else if (body instanceof FormData) {
        xmlHttp.send(body);
    } else {
        xmlHttp.setRequestHeader("Content-Type", "application/json");
        xmlHttp.send(JSON.stringify(body));
    }

    if (xmlHttp.responseText == "") {
        return {};
    }

    try {
        return JSON.parse(xmlHttp.responseText);
    } catch (err) {
        return {};
    }

}

const login = async () => {
    var res = await getToken({
        grant_type: "password",
        username: document.getElementById("ipt-username").value,
        password: document.getElementById("ipt-password").value,
        audience: audience,
        client_id: clientId,
        scope: scope,
    })
    if (!res.mfa_token) {
        log("failed to get mfa_token")
        console.dir(res)
        return
    }
    const token = res.mfa_token
    document.getElementById("login-block").classList.add("hidden")

    var devices = await getMfaDevices(token)
    if (devices.length == 0) {
        return setupFirstMfa(token)
    } else if (devices.length > 0) {
        return loginWithMfa(token, devices)
    } else {
        log("failed to get mfa devices")
        console.dir(devices)
        return
    }
};

const setupFirstMfa = async (token) => {
    document.getElementById("mfa-enroll-block").classList.remove("hidden")

    document.getElementById("btn-add-mfa-sms").onclick = async () => {
        setupFirstMfaSms(token)
    }

    document.getElementById("btn-add-mfa-otp").onclick = async () => {
        setupFirstMfaOtp(token)
    }

    return
}

const setupFirstMfaOtp = async (token) => {
    document.getElementById("btn-add-mfa-sms").classList.add("hidden")
    document.getElementById("ipt-mfa-phone").classList.add("hidden")

    var res = await associateOtp(token)
    if (!res.secret) {
        log("failed to add new otp device")
        console.dir(res)
        return
    }

    document.getElementById("mfa-enroll-block").classList.add("hidden")
    document.getElementById("mfa-verify-block").classList.remove("hidden")
    document.getElementById("verify-mfa-otp-secret").classList.remove("hidden")
    document.getElementById("verify-mfa-otp-secret").value = res.secret
    document.getElementById("verify-mfa-otp-qr").classList.remove("hidden")
    QRCode.toCanvas(document.getElementById("verify-mfa-otp-qr"), res.barcode_uri, function (err) {
        if (err) {
            log("failed to draw QR code");
            console.dir(err);
        }
    })
    document.getElementById("verify-mfa-recovery-code").value = res.recovery_codes[0]

    document.getElementById("btn-verify-mfa").onclick = async () => {
        var res = await getToken({
            mfa_token: token,
            otp: document.getElementById("ipt-mfa-verify-code").value,
            grant_type: 'http://auth0.com/oauth/grant-type/mfa-otp',
            client_id: clientId,
        })
        if (!res.access_token) {
            log("failed to verify otp device");
            console.dir(res);
            return;
        }

        document.getElementById("mfa-verify-block").classList.add("hidden")
        renderGated(res.access_token)
    }
}

const setupFirstMfaSms = async (token) => {
    var res = await associateSms(token, document.getElementById("ipt-mfa-phone").value)
    if (!res.oob_code) {
        log("failed to add new sms device");
        console.dir(res);
        return;
    }
    var oobCode = res.oob_code

    document.getElementById("mfa-enroll-block").classList.add("hidden")
    document.getElementById("mfa-verify-block").classList.remove("hidden")
    document.getElementById("verify-mfa-recovery-code").value = res.recovery_codes[0]

    document.getElementById("btn-verify-mfa").onclick = async () => {
        var res = await getToken({
            mfa_token: token,
            oob_code: oobCode,
            binding_code: document.getElementById("ipt-mfa-verify-code").value,
            grant_type: 'http://auth0.com/oauth/grant-type/mfa-oob',
            client_id: clientId,
        })
        if (!res.access_token) {
            log("failed to verify sms device");
            console.dir(res);
            return;
        }

        document.getElementById("mfa-verify-block").classList.add("hidden")
        renderGated(res.access_token)
    }
}

const loginWithMfa = async (token, devices) => {
    document.getElementById("mfa-choose-block").classList.remove("hidden")
    for (var device of devices) {
        if (device.oob_channel == "sms") {
            enableLoginWithSms(token)
        } else if (device.authenticator_type == "recovery-code") {
            enableLoginWithRecoveryCode(token)
        } else if (device.authenticator_type == "otp") {
            enableLoginWithOtp(token)
        }
    }
    return
}

const enableLoginWithRecoveryCode = async (token) => {
    document.getElementById("btn-choose-mfa-recovery-code").classList.remove("hidden")

    document.getElementById("btn-choose-mfa-recovery-code").onclick = async () => {
        document.getElementById("mfa-choose-block").classList.add("hidden")
        document.getElementById("mfa-submit-block").classList.remove("hidden")

        document.getElementById("btn-submit-mfa").onclick = async () => {
            var res = await getToken({
                mfa_token: token,
                recovery_code: document.getElementById("ipt-submit-mfa-code").value,
                grant_type: 'http://auth0.com/oauth/grant-type/mfa-recovery-code',
                client_id: clientId
            })
            if (!res.access_token) {
                log("failed to get access token")
                console.dir(res)
                return
            }

            document.getElementById("btn-submit-mfa").classList.add("hidden")
            document.getElementById("ipt-submit-mfa-code").classList.add("hidden")
            document.getElementById("mfa-submit-block").classList.add("hidden")
            document.getElementById("mfa-recovery-code-confirm").classList.remove("hidden")
            document.getElementById("submit-mfa-recovery-code").value = res.recovery_code

            document.getElementById("btn-submit-mfa-recovery-code-confirm").onclick = async () => {
                document.getElementById("mfa-recovery-code-confirm").classList.add("hidden")
                renderGated(res.access_token)
            }
        }
    }
}

const enableLoginWithSms = async (token) => {
    document.getElementById("btn-choose-mfa-sms").classList.remove("hidden")

    document.getElementById("btn-choose-mfa-sms").onclick = async () => {
        document.getElementById("mfa-choose-block").classList.add("hidden")
        document.getElementById("mfa-submit-block").classList.remove("hidden")
        var res = httpRequest({
            method: "POST",
            url: `https://${domain}/mfa/challenge`,
            body: {
                mfa_token: token,
                challenge_type: "oob",
                //oob_channel: "sms",
                client_id: clientId,
            }
        });
        if (!res.oob_code) {
            log("failed to add new sms device");
            console.dir(res);
            return;
        }
        var oobCode = res.oob_code

        document.getElementById("btn-submit-mfa").onclick = async () => {
            var res = await getToken({
                mfa_token: token,
                oob_code: oobCode,
                binding_code: document.getElementById("ipt-submit-mfa-code").value,
                grant_type: 'http://auth0.com/oauth/grant-type/mfa-oob',
                client_id: clientId,
            })
            if (!res.access_token) {
                log("failed to get access token")
                console.dir(res)
                return
            }

            document.getElementById("mfa-submit-block").classList.add("hidden")
            renderGated(res.access_token)
        }
    }
}

const enableLoginWithOtp = async (token) => {
    document.getElementById("btn-choose-mfa-otp").classList.remove("hidden")

    document.getElementById("btn-choose-mfa-otp").onclick = async () => {
        document.getElementById("mfa-choose-block").classList.add("hidden")
        document.getElementById("mfa-submit-block").classList.remove("hidden")

        document.getElementById("btn-submit-mfa").onclick = async () => {
            var res = await getToken({
                mfa_token: token,
                otp: document.getElementById("ipt-submit-mfa-code").value,
                grant_type: 'http://auth0.com/oauth/grant-type/mfa-otp',
                client_id: clientId
            })
            if (!res.access_token) {
                log("failed to get access token")
                console.dir(res)
                return
            }

            document.getElementById("mfa-submit-block").classList.add("hidden")
            renderGated(res.access_token)
        }
    }
}

const associateSms = async (token, phone) => {
    return httpRequest({
        method: "POST",
        url: `https://${domain}/mfa/associate`,
        headers: {
            authorization: `Bearer ${token}`
        },
        body: {
            authenticator_types: ["oob"],
            oob_channels: ["sms"],
            phone_number: phone,
        }
    });
}

const associateOtp = async (token) => {
    return httpRequest({
        method: "POST",
        url: `https://${domain}/mfa/associate`,
        headers: {
            authorization: `Bearer ${token}`
        },
        body: {
            authenticator_types: ["otp"],
        }
    });
}

const getToken = async (params) => {
    return httpRequest({
        method: "POST",
        url: `https://${domain}/oauth/token`,
        body: params
    });
}

const getMfaDevices = async (token) => {
    return httpRequest({
        method: "GET",
        url: `https://${domain}/mfa/authenticators`,
        headers: {
            authorization: `Bearer ${token}`
        }
    });
}

const getProfile = async (token) => {
    return httpRequest({
        method: "GET",
        url: `https://${domain}/userinfo?access_token=${token}`,
    });
}

const renderGated = async (token) => {
    document.getElementById("logout-block").classList.remove("hidden")
    document.getElementById("gated-block").classList.remove("hidden")

    document.getElementById("access-token").innerText = token
    document.getElementById("user-profile").innerHTML = JSON.stringify(
        await getProfile(token), null, 2
    );
}