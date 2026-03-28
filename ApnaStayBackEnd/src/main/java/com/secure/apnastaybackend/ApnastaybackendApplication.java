package com.secure.apnastaybackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ApnastaybackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ApnastaybackendApplication.class, args);
	}

}

