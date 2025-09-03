// src/main/java/com/rms/reimbursement_app/config/SpaForwardConfig.java
package com.rms.reimbursement_app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

@Configuration
@Order(Ordered.LOWEST_PRECEDENCE)
public class SpaForwardConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver());
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Root -> index.html
        registry.addViewController("/").setViewName("forward:/index.html");

        // Forward any non-API first-segment route to index.html
        // FIRST segment is validated to NOT be one of: api, actuator, v3, swagger-ui, webjars
        registry.addViewController("/{first:^(?!api$|actuator$|v3$|swagger-ui$|webjars$).+}/**")
                .setViewName("forward:/index.html");
    }

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // defaults ok
    }
}
