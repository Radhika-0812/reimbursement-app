package com.rms.auth_service.service;

import com.rms.auth_service.dtos.*;

public interface UserService {
    AuthRes signup(SignUpReq req);
    AuthRes login(SignInReq req);
}
