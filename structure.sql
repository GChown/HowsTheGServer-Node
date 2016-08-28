DROP TABLE IF EXISTS `comment`;
CREATE TABLE `comment` (
  `C_ID` int(11) NOT NULL AUTO_INCREMENT,
  `googleid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `text` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numvote` int(11) DEFAULT NULL,
  `timesent` datetime DEFAULT NULL,
  PRIMARY KEY (`C_ID`),
  KEY `googleid` (`googleid`),
  CONSTRAINT `comment_ibfk_1` FOREIGN KEY (`googleid`) REFERENCES `user` (`googleid`)
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `googleid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`googleid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `vote`;
CREATE TABLE `vote` (
  `V_ID` int(11) NOT NULL AUTO_INCREMENT,
  `googleid` varchar(255) DEFAULT NULL,
  `vote_b` int(11) DEFAULT NULL,
  `vote_l` int(11) DEFAULT NULL,
  `vote_d` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`V_ID`),
  UNIQUE KEY `unique` (`googleid`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=latin1;
