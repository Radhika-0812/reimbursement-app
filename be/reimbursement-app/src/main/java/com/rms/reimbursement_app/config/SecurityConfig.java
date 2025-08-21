// src/main/java/com/rms/reimbursement_app/config/SecurityConfig.java
package com.rms.reimbursement_app.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.*;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Open endpoints
                        .requestMatchers(
                                "/api/auth/**",
                                // Swagger (dev)
                                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
                        ).permitAll()

                        // Role-protected endpoints
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")          // expects ROLE_ADMIN
                        .requestMatchers("/api/claims/**").hasAnyRole("USER","ADMIN") // expects ROLE_USER/ROLE_ADMIN

                        // Everything else requires auth
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                res.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                        .accessDeniedHandler((req, res, e) ->
                                res.sendError(HttpServletResponse.SC_FORBIDDEN))
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter()))
                );

        return http.build();
    }

    /**
     * Maps roles from several common JWT shapes:
     * - "role": "ADMIN" or "ROLE_ADMIN"
     * - "roles": ["ADMIN", "USER"] or ["ROLE_ADMIN", ...]
     * - Keycloak: "realm_access": { "roles": ["ADMIN", ...] }
     * Also maps OAuth scopes as SCOPE_* (from "scope" or "scp").
     */
    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthConverter() {
        return (Jwt jwt) -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            // 1) Scopes → SCOPE_*
            JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
            scopes.setAuthorityPrefix("SCOPE_");
            // primary "scope", fallback "scp" (Azure AD style)
            scopes.setAuthoritiesClaimName(jwt.hasClaim("scope") ? "scope" : "scp");
            authorities.addAll(scopes.convert(jwt));

            // 2) Roles in various claims
            // Single "role"
            String role = jwt.getClaimAsString("role");
            if (role != null && !role.isBlank()) {
                authorities.add(new SimpleGrantedAuthority(ensureRolePrefix(role)));
            }

            // Array "roles"
            List<String> roles = jwt.getClaimAsStringList("roles");
            if (roles != null) {
                for (String r : roles) {
                    if (r != null && !r.isBlank()) {
                        authorities.add(new SimpleGrantedAuthority(ensureRolePrefix(r)));
                    }
                }
            }

            // Keycloak "realm_access": { "roles": [...] }
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null) {
                Object r = realmAccess.get("roles");
                if (r instanceof Collection<?> list) {
                    for (Object o : list) {
                        if (o != null) {
                            authorities.add(new SimpleGrantedAuthority(ensureRolePrefix(o.toString())));
                        }
                    }
                }
            }

            return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
        };
    }

    private static String ensureRolePrefix(String r) {
        String role = r.trim();
        return role.startsWith("ROLE_") ? role : "ROLE_" + role;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        // In dev you can broaden; in prod, lock this down (env/config).
        cfg.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*"
        ));
        cfg.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Location", "Authorization"));
        cfg.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
