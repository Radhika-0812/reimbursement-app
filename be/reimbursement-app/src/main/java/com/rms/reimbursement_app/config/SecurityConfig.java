// src/main/java/com/rms/reimbursement_app/config/SecurityConfig.java
package com.rms.reimbursement_app.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
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
                        // CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Open endpoints
                        .requestMatchers(
                                "/auth/**",
                                "/api/auth/**",
                                "/api/ping",
                                "/actuator/**",
                                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
                        ).permitAll()

                        // (Optional) make the specific admin endpoints obvious in code reviews
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/claims/*/request-attachment").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/claims/*/recall").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/claims/*/recall/cancel").hasRole("ADMIN")

                        // (Optional) user endpoints made explicit (already covered by /api/claims/** below)
                        .requestMatchers(HttpMethod.PATCH, "/api/claims/*/resubmit").hasAnyRole("USER","ADMIN")
                        .requestMatchers(HttpMethod.POST,  "/api/claims/*/change-request").hasAnyRole("USER","ADMIN")
                        .requestMatchers(HttpMethod.POST,  "/api/claims/*/receipt").hasAnyRole("USER","ADMIN")
                        .requestMatchers(HttpMethod.GET,   "/api/claims/*/receipt").hasAnyRole("USER","ADMIN")
                        .requestMatchers(HttpMethod.HEAD,  "/api/claims/*/receipt").hasAnyRole("USER","ADMIN")

                        // Broad guards (cover everything else under these prefixes)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/claims/**").hasAnyRole("USER","ADMIN")

                        // Everything else
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                        .accessDeniedHandler((req, res, e) -> res.sendError(HttpServletResponse.SC_FORBIDDEN))
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter()))
                );

        return http.build();
    }

    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthConverter() {
        return (Jwt jwt) -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();

            // Map scopes
            JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
            scopes.setAuthorityPrefix("SCOPE_");
            scopes.setAuthoritiesClaimName(jwt.hasClaim("scope") ? "scope" : "scp");
            authorities.addAll(scopes.convert(jwt));

            // Map single role
            String role = jwt.getClaimAsString("role");
            if (role != null && !role.isBlank()) {
                authorities.add(new SimpleGrantedAuthority(ensureRolePrefix(role)));
            }

            // Map roles array
            List<String> roles = jwt.getClaimAsStringList("roles");
            if (roles != null) {
                for (String r : roles) {
                    if (r != null && !r.isBlank()) {
                        authorities.add(new SimpleGrantedAuthority(ensureRolePrefix(r)));
                    }
                }
            }

            // Keycloak-style realm_access.roles
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

            // Use sub as principal name; controllers read uid from claim directly
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
        cfg.setAllowedOriginPatterns(List.of(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "https://reimbursementapp.makingmindstechnologies.com"
        ));
        cfg.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS","HEAD"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Location", "Authorization"));
        cfg.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
