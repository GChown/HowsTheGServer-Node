use HowsTheGdb;

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `U_ID` int(11) NOT NULL AUTO_INCREMENT,
  `device` varchar(255) NOT NULL,
  `usrname` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`U_ID`),
  UNIQUE KEY `device` (`device`)
) ENGINE=InnoDB AUTO_INCREMENT=259 DEFAULT CHARSET=latin1;
DROP TABLE IF EXISTS `comment`;
CREATE TABLE `comment` (
  `C_ID` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `text` varchar(255) NOT NULL,
  `numvote` int(11) NOT NULL DEFAULT '1',
  `timesent` datetime NOT NULL DEFAULT '2016-01-14 13:05:23',
  PRIMARY KEY (`C_ID`),
  KEY `uid` (`uid`),
  CONSTRAINT `comment_ibfk_1` FOREIGN KEY (`uid`) REFERENCES `user` (`U_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
DROP TABLE IF EXISTS `vote`;
CREATE TABLE `vote` (
  `V_ID` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `vote_b` int(11) DEFAULT NULL,
  `vote_l` int(11) DEFAULT NULL,
  `vote_d` int(11) DEFAULT NULL,
  `lastvote` datetime NOT NULL,
  PRIMARY KEY (`V_ID`),
  KEY `uid` (`uid`),
  CONSTRAINT `vote_ibfk_1` FOREIGN KEY (`uid`) REFERENCES `user` (`U_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=latin1;
