package com.rms.auth_service.security;

import com.rms.auth_service.repository.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String h = req.getHeader("Authorization");
            if (h != null && h.startsWith("Bearer ")) {
                String token = h.substring(7);
                try {
                    String email = jwt.validateAndGetSubject(token);
                    users.findByEmail(email).ifPresent(u -> {
                        var auths = List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole()));
                        var auth = new UsernamePasswordAuthenticationToken(email, null, auths);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
                } catch (Exception ignored) { /* leave unauthenticated */ }
            }
        }
        chain.doFilter(req, res);
    }
}
