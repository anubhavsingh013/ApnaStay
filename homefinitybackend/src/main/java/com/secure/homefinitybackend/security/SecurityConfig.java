package com.secure.homefinitybackend.security;

import com.secure.homefinitybackend.models.AppRole;
import com.secure.homefinitybackend.models.Role;
import com.secure.homefinitybackend.models.User;
import com.secure.homefinitybackend.repositories.RoleRepository;
import com.secure.homefinitybackend.repositories.UserRepository;
import com.secure.homefinitybackend.security.jwt.AuthEntryPointJwt;
import com.secure.homefinitybackend.security.jwt.AuthTokenFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.LocalDate;
import java.util.Arrays;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@Slf4j
public class SecurityConfig {

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;
    @Value("${frontend.url}")
    String frontendUrl;

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }
    @Bean
    SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) {

        http.authorizeHttpRequests((requests) -> requests
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/csrf-token").permitAll()
                .requestMatchers("/api/auth/public/**").permitAll()
                .requestMatchers("/api/health-check/**").permitAll()
                .anyRequest().authenticated());

        // making authentrypoint as default exception handler class for authentication
        http.exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler));
        // add custom filter to validate the jwt before actual username and password authentication
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        // allow cors
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        http.httpBasic(withDefaults());
        // http.csrf(csrf->csrf.disable());
        http.csrf(csrf-> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/auth/public/**", "/oauth2/**"));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        corsConfig.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000","http://localhost:5173",
                "https://noteworthy2fa.netlify.app",
                frontendUrl  // Keep this for other environments
        ));
        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        corsConfig.setAllowedHeaders(Arrays.asList("authorization", "content-type", "x-xsrf-token", "x-requested-with"));
        corsConfig.setAllowCredentials(true);
        corsConfig.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig); // Apply to all endpoints
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception{
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    // inject data into the database
    @Bean
    public CommandLineRunner initData(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            Role userRole = roleRepository.findByRoleName(AppRole.ROLE_USER)
                    .orElseGet(() -> roleRepository.save(new Role(AppRole.ROLE_USER)));

            Role adminRole = roleRepository.findByRoleName(AppRole.ROLE_ADMIN)
                    .orElseGet(() -> roleRepository.save(new Role(AppRole.ROLE_ADMIN)));

            Role brokerRole = roleRepository.findByRoleName(AppRole.ROLE_BROKER)
                    .orElseGet(() -> roleRepository.save(new Role(AppRole.ROLE_BROKER)));
            Role ownerRole = roleRepository.findByRoleName(AppRole.ROLE_OWNER)
                    .orElseGet(() -> roleRepository.save(new Role(AppRole.ROLE_OWNER)));

            if (!userRepository.existsByUserName("user1")) {
                User user1 = new User("user1", "user1@gmail.com", passwordEncoder.encode("userpass"));
                user1.setAccountNonLocked(false);
                user1.setAccountNonExpired(true);
                user1.setCredentialsNonExpired(true);
                user1.setEnabled(true);
                user1.setCredentialsExpiryDate(LocalDate.now().plusYears(1));
                user1.setAccountExpiryDate(LocalDate.now().plusYears(1));
                user1.setTwoFactorEnabled(false);
                user1.setSignUpMethod("email");
                user1.setRole(userRole);
                userRepository.save(user1);
            }

            if (!userRepository.existsByUserName("admin")) {
                User admin = new User("admin", "admin@example.com", passwordEncoder.encode("adminpass"));
                admin.setAccountNonLocked(true);
                admin.setAccountNonExpired(true);
                admin.setCredentialsNonExpired(true);
                admin.setEnabled(true);
                admin.setCredentialsExpiryDate(LocalDate.now().plusYears(1));
                admin.setAccountExpiryDate(LocalDate.now().plusYears(1));
                admin.setTwoFactorEnabled(false);
                admin.setSignUpMethod("email");
                admin.setRole(adminRole);
                userRepository.save(admin);
            }
            if (!userRepository.existsByUserName("broker1")) {
                User broker = new User("broker1", "broker@gmail.com", passwordEncoder.encode("brokerpass"));
                broker.setAccountNonLocked(true);
                broker.setAccountNonExpired(true);
                broker.setCredentialsNonExpired(true);
                broker.setEnabled(true);
                broker.setCredentialsExpiryDate(LocalDate.now().plusYears(1));
                broker.setAccountExpiryDate(LocalDate.now().plusYears(1));
                broker.setTwoFactorEnabled(false);
                broker.setSignUpMethod("email");
                broker.setRole(brokerRole);
                userRepository.save(broker);
            }
            if (!userRepository.existsByUserName("owner1")) {
                User owner = new User("owner1", "owner@gmail.com", passwordEncoder.encode("ownerpass"));
                owner.setAccountNonLocked(true);
                owner.setAccountNonExpired(true);
                owner.setCredentialsNonExpired(true);
                owner.setEnabled(true);
                owner.setCredentialsExpiryDate(LocalDate.now().plusYears(1));
                owner.setAccountExpiryDate(LocalDate.now().plusYears(1));
                owner.setTwoFactorEnabled(false);
                owner.setSignUpMethod("email");
                owner.setRole(ownerRole);
                userRepository.save(owner);
            }
        };
    }
}
