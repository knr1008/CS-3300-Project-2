-- need a database to use   previously used ->       use histor72_sapp;

CREATE TABLE User (
	email VARCHAR(50) NOT NULL,
    password VARCHAR(200) NOT NULL,
	firstName VARCHAR(50) NOT NULL,
	lastName VARCHAR(50) NOT NULL,
    phoneNumber VARCHAR(50) NOT NULL,
    lastLogin timestamp default current_timestamp,
	PRIMARY KEY (email, title)
);

DELIMITER //
CREATE TRIGGER `user_update_to_gmt-5` BEFORE INSERT ON `User` FOR EACH ROW BEGIN
set new.lastLogin=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER `user_update_login_to_gmt-5` BEFORE UPDATE ON `User` FOR EACH ROW BEGIN
set new.lastLogin=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;

CREATE TABLE Posts (
	email VARCHAR(50) NOT NULL,
	title VARCHAR(50) NOT NULL,
    postId int NOT NULL auto_increment,
	postText VARCHAR(300) NOT NULL,
	postDate timestamp default current_timestamp,
	PRIMARY KEY (postId),
    FOREIGN KEY (email, title)
		REFERENCES User (email, title)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
DELIMITER //
CREATE TRIGGER `post_update_to_gmt-5` BEFORE INSERT ON `Posts` FOR EACH ROW BEGIN
set new.postDate=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;
